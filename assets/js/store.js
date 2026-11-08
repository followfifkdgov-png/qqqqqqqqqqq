/* ============================================================
   Austerra Agri Solutions POS - data layer (PHP + MySQL)
   The browser keeps a working copy in memory for instant UI.
   Every change is sent to api.php and stored in MySQL.
   ============================================================ */

(function (global) {
  "use strict";

  var THEME_KEY = "austerra.prefs.theme";
  var CSRF = "";
  var authed = false;
  var writeChain = Promise.resolve();
  var reloadTimer = null;
  var lastWriteErrorAt = 0;

  var DEFAULT_SHOP = {
    name: "AUSTERRA AGRI SOLUTIONS",
    legalName: "AUSTERRA AGRI SOLUTIONS (PVT) LTD",
    tagline: "Agri Solutions",
    address: "176/4, Kaluwagaha Addara Waththa, Godakanda, Galle, Sri Lanka",
    phone: "+94 77 303 5055",
    email: "austerraagrisolutions@gmail.com",
    currency: "Rs.",
    target: 10000,
    billPrinter: "dot",
    billPaper: "9.5x5.5",
    reportPaper: "9.5x11",
  };

  /* ---------------- small utils ---------------- */

  function uid(prefix) {
    var rnd = Math.random().toString(36).slice(2, 9);
    var t = Date.now().toString(36).slice(-4);
    return (prefix || "id") + "_" + rnd + t;
  }

  function startOfDay(ts) {
    var d = new Date(ts == null ? Date.now() : ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function addDays(ts, n) {
    var d = new Date(ts);
    d.setDate(d.getDate() + n);
    return d.getTime();
  }

  function startOfWeek(ts) {
    var d = new Date(startOfDay(ts));
    var day = d.getDay();
    var diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d.getTime();
  }

  function startOfMonth(ts) {
    var d = new Date(ts);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dateKey(ts) {
    var d = new Date(ts);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function currency() {
    return (Store.db && Store.db.shop && Store.db.shop.currency) || "Rs.";
  }

  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) v = 0;
    var sign = v < 0 ? "-" : "";
    var s = Math.abs(v).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return sign + currency() + " " + s;
  }

  function num(n, digits) {
    var v = Number(n) || 0;
    return v.toLocaleString("en-LK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits == null ? 2 : digits,
    });
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function dateShort(ts) {
    var d = new Date(ts);
    return String(d.getDate()).padStart(2, "0") + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  function dayFull(ts) {
    var d = new Date(ts);
    return DAYS[d.getDay()] + ", " + String(d.getDate()).padStart(2, "0") + " " +
      MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  function timeShort(ts) {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function dateTime(ts) {
    return dateShort(ts) + ", " + timeShort(ts);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------------- unit conversion ---------------- */

  /* Stock is kept in the item's `unit` (stock unit). A bill can be sold in any
     compatible unit; this converts between them.

     Weight : kg (base), g        (1 kg = 1000 g)
     Volume : ltr (base), ml      (1 ltr = 1000 ml)
     Count  : pcs (base), dozen   (1 dozen = 12 pcs) */
  var UNIT_GROUPS = {
    weight: { kg: 1, g: 0.001 },
    volume: { ltr: 1, ml: 0.001 },
    count:  { pcs: 1, dozen: 12 },
  };

  function unitGroup(u) {
    u = String(u == null ? "" : u).toLowerCase();
    for (var g in UNIT_GROUPS) {
      if (UNIT_GROUPS[g][u] != null) { return g; }
    }
    return null;
  }

  function unitFactor(u) {
    u = String(u == null ? "" : u).toLowerCase();
    for (var g in UNIT_GROUPS) {
      if (UNIT_GROUPS[g][u] != null) { return UNIT_GROUPS[g][u]; }
    }
    return null;
  }

  /* How many `to` units equal one `from` unit. */
  function unitRatio(fromU, toU) {
    var f = unitFactor(fromU), t = unitFactor(toU);
    if (f == null || t == null || t === 0) { return 1; }
    return f / t;
  }

  /* Convert qty from `from` unit to `to` unit. null when incompatible. */
  function convertQty(qty, fromU, toU) {
    if (unitGroup(fromU) !== unitGroup(toU)) { return null; }
    return Number(qty || 0) * unitRatio(fromU, toU);
  }

  /* Selling-unit qty -> qty in the item's stock unit. null when incompatible
     (e.g. selling in ml when stock is kept in kg). */
  function qtyToStockUnit(qty, sellingUnit, stockUnit) {
    sellingUnit = String(sellingUnit || "pcs").toLowerCase();
    stockUnit   = String(stockUnit || "pcs").toLowerCase();
    if (sellingUnit === "" || stockUnit === "") { return null; }
    if (unitGroup(sellingUnit) !== unitGroup(stockUnit)) { return null; }
    return Number((Number(qty || 0) * unitRatio(sellingUnit, stockUnit)).toFixed(3));
  }

  /* ---------------- server transport ---------------- */

  function api(action, body) {
    var opts = {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers: {},
      cache: "no-store",
    };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    if (CSRF) opts.headers["X-CSRF-Token"] = CSRF;

    return fetch("api.php?action=" + encodeURIComponent(action), opts)
      .catch(function () {
        var err = new Error("Cannot reach the server. Check the internet / hosting connection and try again.");
        err.status = 0;
        throw err;
      })
      .then(function (res) {
        return res.text().then(function (text) {
          var json = null;
          try { json = JSON.parse(text); } catch (e) { json = null; }

          if (!json) {
            var bad = new Error("The server returned an unexpected response. Check that PHP and MySQL are working on your hosting.");
            bad.status = res.status;
            throw bad;
          }
          if (!res.ok || !json.ok) {
            var err = new Error(json.error || ("Request failed (" + res.status + ")."));
            err.status = res.status;
            if (res.status === 401 && action !== "auth.login" && action !== "bootstrap") {
              setTimeout(handleAuthLost, 0);
            }
            throw err;
          }
          return json.data;
        });
      });
  }

  function replaceById(list, record) {
    if (!record || !record.id) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === record.id) {
        list[i] = record;
        return record;
      }
    }
    return null;
  }

  function enqueue(factory, label) {
    writeChain = writeChain.then(function () {
      return factory().catch(function (err) {
        reportWriteError(err, label);
      });
    });
    return writeChain;
  }

  function reportWriteError(err, label) {
    if (err && err.status === 401) {
      handleAuthLost();
      return;
    }
    console.error("POS save failed (" + (label || "request") + "):", err);
    var now = Date.now();
    if (now - lastWriteErrorAt > 2500) {
      lastWriteErrorAt = now;
      if (global.POS && global.POS.ui && global.POS.ui.toast) {
        global.POS.ui.toast("Could not save to the server. Reloading the latest data…", "err");
      }
    }
    scheduleResync();
  }

  function handleAuthLost() {
    if (!authed) return;
    authed = false;
    if (global.POS && global.POS.ui) {
      if (global.POS.ui.closeSheet) global.POS.ui.closeSheet();
      if (global.POS.ui.closeModal) global.POS.ui.closeModal();
    }
    if (global.POS && global.POS.app && global.POS.app.onAuthLost) {
      global.POS.app.onAuthLost();
    }
  }

  function scheduleResync() {
    if (reloadTimer) return;
    reloadTimer = setTimeout(function () {
      reloadTimer = null;
      Store.resync();
    }, 1200);
  }

  function normalizeDb(input) {
    var d = input && typeof input === "object" ? input : {};
    var shop = Object.assign({}, DEFAULT_SHOP, d.shop || {});
    var prefs = d.prefs && typeof d.prefs === "object" ? d.prefs : { theme: "dark" };
    var day = d.day && typeof d.day === "object" ? d.day : { open: true, openedAt: startOfDay(Date.now()), closedAt: null };

    d.v = 2;
    d.shop = shop;
    d.prefs = prefs;
    d.day = {
      open: !!day.open,
      openedAt: Number(day.openedAt) || startOfDay(Date.now()),
      closedAt: day.closedAt == null ? null : Number(day.closedAt),
    };
    d.counters = d.counters && typeof d.counters === "object" ? d.counters : { counter: "01" };
    if (!d.counters.counter) d.counters.counter = "01";
    d.seq = typeof d.seq === "number" && d.seq > 0 ? d.seq : 1001;
    d.auth = d.auth && typeof d.auth === "object" ? d.auth : { username: "", isDefault: false };
    d.items = Array.isArray(d.items) ? d.items : [];
    d.customers = Array.isArray(d.customers) ? d.customers : [];
    d.bills = Array.isArray(d.bills) ? d.bills : [];

    d.items.forEach(function (i) {
      if (i.active === undefined) i.active = true;
      if (!i.unit) i.unit = "pcs";
      i.cost = Number(i.cost) || 0;
      i.price = Number(i.price) || 0;
      i.qty = Number(i.qty) || 0;
      i.reorder = Number(i.reorder) || 0;
    });
    d.bills.forEach(function (b) {
      if (b.subtotal == null) b.subtotal = b.total || 0;
      if (b.balance == null) b.balance = Math.max(0, (b.total || 0) - (b.paid || 0));
      if (b.discount == null) b.discount = 0;
      if (b.method == null) b.method = "Cash";
      if (!Array.isArray(b.lines)) b.lines = [];
    });
    return d;
  }

  function applyBootstrap(data) {
    CSRF = data && data.csrf ? data.csrf : CSRF;
    authed = !!(data && data.authed);

    var db = normalizeDb(data && data.db);
    var user = data && data.user;
    db.auth = {
      username: user && user.username ? user.username : "",
      isDefault: !!(user && user.isDefault),
    };

    Store.db = db;

    // A theme chosen on the login screen is kept locally until sign-in.
    if (!authed) {
      try {
        var cached = localStorage.getItem(THEME_KEY);
        if (cached === "dark" || cached === "light" || cached === "system") {
          Store.db.prefs.theme = cached;
        }
      } catch (e) { /* storage blocked */ }
    }

    return Store.db;
  }

  /* ---------------- store ---------------- */

  var Store = {
    db: null,

    /* Load everything from MySQL (called once at start-up). */
    load: function () {
      return api("bootstrap").then(function (data) {
        applyBootstrap(data);
        return Store.db;
      });
    },

    resync: function () {
      return api("bootstrap")
        .then(function (data) {
          applyBootstrap(data);
          if (global.POS && global.POS.app) {
            global.POS.app.applyTheme();
            global.POS.app.refresh();
          }
          return Store.db;
        })
        .catch(function (err) {
          console.error("POS resync failed:", err);
          if (err && err.status === 401) handleAuthLost();
        });
    },

    /* Settings, theme, day control and bill sequence. */
    save: function () {
      if (!authed) {
        try { localStorage.setItem(THEME_KEY, (Store.db.prefs && Store.db.prefs.theme) || "dark"); } catch (e) {}
        return Promise.resolve();
      }

      var db = Store.db;
      var payload = {
        shop: db.shop,
        prefs: db.prefs,
        day: db.day,
        counters: db.counters,
        seq: db.seq,
      };

      return enqueue(function () {
        return api("state.save", payload).then(function (res) {
          if (res) {
            if (res.seq) db.seq = res.seq;
            if (res.day) db.day = res.day;
            if (res.shop) db.shop = Object.assign(db.shop, res.shop);
            if (res.prefs) db.prefs = Object.assign(db.prefs, res.prefs);
          }
        });
      }, "settings");
    },

    reset: function () {
      return api("data.reset", {}).then(function (res) {
        var auth = Store.db ? Store.db.auth : { username: "", isDefault: false };
        Store.db = normalizeDb(res.db);
        Store.db.auth = auth;
        return Store.db;
      });
    },

    clearSales: function () {
      return api("bill.clearAll", {}).then(function () {
        Store.db.bills = [];
        Store.db.seq = 1001;
      });
    },

    /* ---------- auth ---------- */

    isAuthed: function () {
      return authed;
    },

    login: function (username, password) {
      return api("auth.login", { username: username, password: password })
        .then(function (data) {
          var cachedTheme = null;
          try { cachedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}

          applyBootstrap(data);

          if (cachedTheme && ["dark", "light", "system"].indexOf(cachedTheme) !== -1) {
            Store.db.prefs.theme = cachedTheme;
            Store.save();
          }
          try { localStorage.removeItem(THEME_KEY); } catch (e) {}
          return true;
        })
        .catch(function (err) {
          if (err && (err.status === 401 || err.status === 429 || err.status === 400)) {
            return err.message;
          }
          return err && err.message ? err.message : "Could not sign in. Please try again.";
        });
    },

    logout: function () {
      return api("auth.logout", {}).then(function (data) {
        applyBootstrap(data);
      }).catch(function () {
        // Even if the network is down, close the local session.
        authed = false;
        if (Store.db) {
          Store.db.items = [];
          Store.db.customers = [];
          Store.db.bills = [];
        }
      });
    },

    /* Called when the server says the session is gone. */
    logoutLocal: function () {
      authed = false;
    },

    changePassword: function (current, next) {
      return api("auth.changePassword", { current: current, next: next })
        .then(function () {
          if (Store.db && Store.db.auth) Store.db.auth.isDefault = false;
          return null;
        })
        .catch(function (err) {
          return err && err.message ? err.message : "Could not change the password.";
        });
    },

    /* ---------- day ---------- */

    dayOpen: function () { return !!Store.db.day.open; },

    dayEnd: function () {
      var openBills = this.billsSince(Store.db.day.openedAt);
      Store.db.day.open = false;
      Store.db.day.closedAt = Date.now();
      this.save();
      return openBills;
    },

    startDay: function () {
      Store.db.day.open = true;
      Store.db.day.openedAt = Date.now();
      Store.db.day.closedAt = null;
      this.save();
    },

    billsSince: function (ts) {
      return Store.db.bills.filter(function (b) { return b.ts >= ts; });
    },

    /* ---------- items ---------- */

    items: function (includeInactive) {
      return Store.db.items.filter(function (i) { return includeInactive || i.active !== false; });
    },

    item: function (id) {
      return Store.db.items.filter(function (i) { return i.id === id; })[0] || null;
    },

    addItem: function (data) {
      var item = {
        id: uid("itm"),
        name: String(data.name || "").trim(),
        category: String(data.category || "General").trim() || "General",
        unit: data.unit || "pcs",
        cost: Number(data.cost) || 0,
        price: Number(data.price) || 0,
        qty: Number(data.qty) || 0,
        reorder: Number(data.reorder) || 0,
        active: true,
        createdAt: Date.now(),
      };
      if (!item.name) return { error: "Item name is required." };
      if (item.price < 0 || item.cost < 0 || item.qty < 0) return { error: "Numbers cannot be negative." };

      Store.db.items.unshift(item);
      enqueue(function () {
        return api("item.create", item).then(function (res) {
          replaceById(Store.db.items, res && res.item);
        });
      }, "add item");

      return { item: item };
    },

    updateItem: function (id, data) {
      var item = this.item(id);
      if (!item) return { error: "Item not found." };
      var name = String(data.name == null ? item.name : data.name).trim();
      if (!name) return { error: "Item name is required." };
      if (Number(data.cost) < 0 || Number(data.price) < 0 || Number(data.qty) < 0) {
        return { error: "Numbers cannot be negative." };
      }

      item.name = name;
      if (data.category != null) item.category = String(data.category).trim() || "General";
      if (data.unit != null) item.unit = data.unit;
      if (data.cost != null) item.cost = Number(data.cost) || 0;
      if (data.price != null) item.price = Number(data.price) || 0;
      if (data.qty != null) item.qty = Number(data.qty) || 0;
      if (data.reorder != null) item.reorder = Number(data.reorder) || 0;

      var copy = Object.assign({}, item);
      enqueue(function () {
        return api("item.update", { id: id, item: copy }).then(function (res) {
          replaceById(Store.db.items, res && res.item);
        });
      }, "update item");

      return { item: item };
    },

    deleteItem: function (id) {
      var item = this.item(id);
      if (!item) return;
      item.active = false;
      enqueue(function () {
        return api("item.delete", { id: id });
      }, "delete item");
    },

    restoreItem: function (id) {
      var item = this.item(id);
      if (!item) return;
      item.active = true;
      enqueue(function () {
        return api("item.restore", { id: id });
      }, "restore item");
    },

    adjustStock: function (id, delta) {
      var item = this.item(id);
      if (!item) return;
      item.qty = Math.max(0, Number((item.qty + delta).toFixed(3)));
      var qty = item.qty;
      enqueue(function () {
        return api("item.setQty", { id: id, qty: qty });
      }, "adjust stock");
    },

    lowStock: function () {
      return Store.db.items.filter(function (i) {
        return i.active !== false && Number(i.qty) <= Number(i.reorder);
      });
    },

    categories: function () {
      var seen = {};
      var out = [];
      Store.db.items.forEach(function (i) {
        if (i.category && !seen[i.category]) { seen[i.category] = 1; out.push(i.category); }
      });
      return out.sort();
    },

    /* ---------- customers ---------- */

    customers: function () { return Store.db.customers.slice(); },

    customer: function (id) {
      return Store.db.customers.filter(function (c) { return c.id === id; })[0] || null;
    },

    addCustomer: function (data) {
      var c = {
        id: uid("cus"),
        name: String(data.name || "").trim(),
        phone: String(data.phone || "").trim(),
        address: String(data.address || "").trim(),
        note: String(data.note || "").trim(),
        createdAt: Date.now(),
      };
      if (!c.name) return { error: "Customer name is required." };

      Store.db.customers.unshift(c);
      enqueue(function () {
        return api("customer.create", c).then(function (res) {
          replaceById(Store.db.customers, res && res.customer);
        });
      }, "add customer");

      return { customer: c };
    },

    updateCustomer: function (id, data) {
      var c = this.customer(id);
      if (!c) return { error: "Customer not found." };
      var name = String(data.name == null ? c.name : data.name).trim();
      if (!name) return { error: "Customer name is required." };

      c.name = name;
      if (data.phone != null) c.phone = String(data.phone).trim();
      if (data.address != null) c.address = String(data.address).trim();
      if (data.note != null) c.note = String(data.note).trim();

      var copy = Object.assign({}, c);
      enqueue(function () {
        return api("customer.update", { id: id, customer: copy }).then(function (res) {
          replaceById(Store.db.customers, res && res.customer);
        });
      }, "update customer");

      return { customer: c };
    },

    deleteCustomer: function (id) {
      Store.db.customers = Store.db.customers.filter(function (c) { return c.id !== id; });
      enqueue(function () {
        return api("customer.delete", { id: id });
      }, "delete customer");
    },

    customerBalance: function (id) {
      return Store.db.bills.reduce(function (sum, b) {
        if (b.customerId === id) return sum + Math.max(0, (b.total || 0) - (b.paid || 0));
        return sum;
      }, 0);
    },

    customerBills: function (id) {
      return Store.db.bills
        .filter(function (b) { return b.customerId === id; })
        .sort(function (a, b) { return b.ts - a.ts; });
    },

    /* ---------- billing ---------- */

    nextBillNo: function () {
      return "WF-" + (Store.db.seq || 1001);
    },

    createBill: function (opts) {
      var self = this;
      var lines = (opts.lines || []).map(function (l) {
        return {
          itemId: l.itemId,
          name: l.name,
          unit: l.unit || "pcs",
          price: Number(l.price) || 0,
          cost: Number(l.cost) || 0,
          qty: Number(l.qty) || 0,
        };
      });

      if (!lines.length) return Promise.resolve({ error: "Add at least one item to the bill." });
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].qty <= 0) return Promise.resolve({ error: "Quantity must be greater than zero." });
        var it = self.item(lines[i].itemId);
        if (it) {
          var stockQty = qtyToStockUnit(lines[i].qty, lines[i].unit, it.unit);
          if (stockQty == null) {
            return Promise.resolve({ error: it.name + " එක " + it.unit + " ක් වෙන්නේ, " + (lines[i].unit || "pcs") + " ලෙස විකුණාගැනීම එපා." });
          }
          if (Number(it.qty) < stockQty) {
            return Promise.resolve({ error: "Not enough stock for " + it.name + " (only " + num(it.qty) + " " + it.unit + " left)." });
          }
        }
      }

      var payload = {
        customerId: opts.customerId || null,
        lines: lines,
        discount: Math.max(0, Number(opts.discount) || 0),
        paid: Math.max(0, Number(opts.paid) || 0),
        method: opts.method || "Cash",
        bankName: String(opts.bankName || ""),
        chequeNo: String(opts.chequeNo || ""),
        note: String(opts.note || ""),
      };

      return api("bill.create", payload)
        .then(function (res) {
          var bill = res.bill;
          Store.db.bills.push(bill);
          if (res.seq) Store.db.seq = res.seq;

          (bill.lines || []).forEach(function (l) {
            var item = self.item(l.itemId);
            if (item) {
              var d = l.stockQty != null ? l.stockQty : l.qty;
              item.qty = Math.max(0, Number((item.qty - d).toFixed(3)));
            }
          });

          return { bill: bill };
        })
        .catch(function (err) {
          return { error: err && err.message ? err.message : "Could not save the bill." };
        });
    },

    bill: function (id) {
      return Store.db.bills.filter(function (b) { return b.id === id; })[0] || null;
    },

    deleteBills: function (ids) {
      var self = this;
      var set = {};
      ids.forEach(function (id) { set[id] = 1; });
      var removed = Store.db.bills.filter(function (b) { return set[b.id]; });

      // Put stock back locally; the server does the same in one transaction.
      removed.forEach(function (b) {
        (b.lines || []).forEach(function (l) {
          var item = self.item(l.itemId);
          if (item) {
            var d = l.stockQty != null ? l.stockQty : l.qty;
            item.qty = Number((item.qty + d).toFixed(3));
          }
        });
      });

      Store.db.bills = Store.db.bills.filter(function (b) { return !set[b.id]; });

      enqueue(function () {
        return api("bill.delete", { ids: ids });
      }, "delete bills");

      return removed.length;
    },

    payBill: function (id, amount) {
      var b = this.bill(id);
      if (!b) return { error: "Bill not found." };
      amount = Math.max(0, Number(amount) || 0);

      b.paid = Math.min(b.total, Number(b.paid || 0) + amount);
      b.balance = Math.max(0, b.total - b.paid);

      enqueue(function () {
        return api("bill.pay", { id: id, amount: amount }).then(function (res) {
          if (res && res.bill) {
            var current = Store.db.bills.filter(function (x) { return x.id === id; })[0];
            if (current) {
              current.paid = res.bill.paid;
              current.balance = res.bill.balance;
            }
          }
        });
      }, "record payment");

      return { bill: b };
    },

    /* ---------- stats ---------- */

    billsBetween: function (from, to) {
      return Store.db.bills.filter(function (b) { return b.ts >= from && b.ts < to; });
    },

    summarize: function (bills) {
      var out = {
        count: bills.length,
        items: 0,
        total: 0,
        paid: 0,
        balance: 0,
        profit: 0,
        cash: 0,
        card: 0,
        bank: 0,
        cheque: 0,
        credit: 0,
      };
      bills.forEach(function (b) {
        out.total += b.total || 0;
        out.paid += b.paid || 0;
        out.balance += Math.max(0, (b.total || 0) - (b.paid || 0));
        out.profit += b.profit || 0;
        (b.lines || []).forEach(function (l) { out.items += l.qty || 0; });
        if (b.method === "Card") out.card += b.total || 0;
        else if (b.method === "Bank") out.bank += b.total || 0;
        else if (b.method === "Cheque") out.cheque += b.total || 0;
        else if (b.method === "Credit") out.credit += b.total || 0;
        else out.cash += b.total || 0;
      });
      out.avg = out.count ? out.total / out.count : 0;
      return out;
    },

    rangeFor: function (type, anchorTs) {
      var anchor = anchorTs || Date.now();
      if (type === "week") {
        var from = startOfWeek(anchor);
        return { from: from, to: addDays(from, 7), label: "Week of " + dateShort(from) };
      }
      if (type === "month") {
        var m = new Date(startOfMonth(anchor));
        var next = new Date(m);
        next.setMonth(next.getMonth() + 1);
        return { from: m.getTime(), to: next.getTime(), label: MONTHS[m.getMonth()] + " " + m.getFullYear() };
      }
      var d = startOfDay(anchor);
      return { from: d, to: addDays(d, 1), label: dayFull(d) };
    },

    hourly: function (bills) {
      var buckets = new Array(24).fill(0);
      bills.forEach(function (b) {
        var h = new Date(b.ts).getHours();
        buckets[h] += b.total || 0;
      });
      return buckets;
    },

    topItems: function (bills, limit) {
      var map = {};
      bills.forEach(function (b) {
        (b.lines || []).forEach(function (l) {
          if (!map[l.itemId]) map[l.itemId] = { itemId: l.itemId, name: l.name, qty: 0, revenue: 0 };
          map[l.itemId].qty += l.qty || 0;
          map[l.itemId].revenue += (l.price || 0) * (l.qty || 0);
        });
      });
      return Object.keys(map)
        .map(function (k) { return map[k]; })
        .sort(function (a, b) { return b.revenue - a.revenue; })
        .slice(0, limit || 6);
    },

    dailySeries: function (days, endTs) {
      var out = [];
      var end = startOfDay(endTs == null ? Date.now() : endTs);
      for (var i = days - 1; i >= 0; i--) {
        var d = addDays(end, -i);
        var bills = this.billsBetween(d, addDays(d, 1));
        out.push({
          ts: d,
          label: DAYS[new Date(d).getDay()],
          date: dateShort(d),
          total: bills.reduce(function (s, b) { return s + (b.total || 0); }, 0),
          profit: bills.reduce(function (s, b) { return s + (b.profit || 0); }, 0),
          count: bills.length,
        });
      }
      return out;
    },

    /* ---------- backup ---------- */

    exportJSON: function () {
      return api("backup.export").then(function (snapshot) {
        return JSON.stringify(snapshot, null, 2);
      });
    },

    importJSON: function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return Promise.resolve("Could not read that file. Please choose a valid backup JSON.");
      }
      if (!data || !Array.isArray(data.items) || !Array.isArray(data.bills)) {
        return Promise.resolve("That file does not look like an Austerra POS backup.");
      }

      return api("backup.import", { snapshot: data })
        .then(function (res) {
          var auth = Store.db ? Store.db.auth : { username: "", isDefault: false };
          Store.db = normalizeDb(res.db);
          Store.db.auth = auth;
          return null;
        })
        .catch(function (err) {
          return err && err.message ? err.message : "Could not restore that backup.";
        });
    },
  };

  global.POS = global.POS || {};
  global.POS.store = Store;
  global.POS.util = {
    uid: uid,
    startOfDay: startOfDay,
    addDays: addDays,
    startOfWeek: startOfWeek,
    startOfMonth: startOfMonth,
    dateKey: dateKey,
    money: money,
    num: num,
    dateShort: dateShort,
    dayFull: dayFull,
    timeShort: timeShort,
    dateTime: dateTime,
    esc: esc,
    MONTHS: MONTHS,
    DAYS: DAYS,
    /* Unit conversion (selling unit <-> item stock unit). */
    unitGroup: unitGroup,
    unitFactor: unitFactor,
    unitRatio: unitRatio,
    convertQty: convertQty,
    qtyToStockUnit: qtyToStockUnit,
  };
})(window);
