/* ============================================================
   Austerra Agri Solutions POS - screens
   ============================================================ */

(function (global) {
  "use strict";

  var U = global.POS.util;
  var S = global.POS.store;
  var UI = global.POS.ui;
  var views = {};

  /* ============================================================
     shared helpers
     ============================================================ */

  function head(title, sub, tools) {
    return '<div class="card-head">' +
      "<div>" +
      '<div class="card-title">' + title + "</div>" +
      (sub ? '<div class="card-sub">' + sub + "</div>" : "") +
      "</div>" +
      (tools ? '<div class="card-tools">' + tools + "</div>" : "") +
      "</div>";
  }

  function emptyState(iconName, title, text, action) {
    return '<div class="empty">' +
      '<div class="empty-icon">' + UI.icon(iconName || "info", 22) + "</div>" +
      "<strong>" + U.esc(title) + "</strong>" +
      (text ? "<p>" + U.esc(text) + "</p>" : "") +
      (action || "") +
      "</div>";
  }

  function amount(n) {
    return Number(n || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /* Category combobox: click the field to see every existing category;
     type a NEW name and an "+ Add new category" row appears. Selecting a row
     fills the input, so a category typed once stays selectable everywhere. */
  function categoryCombo(input) {
    if (!input || input.dataset.catCombo === "1") return;
    input.dataset.catCombo = "1";
    input.removeAttribute("list"); // native datalist off - using our own dropdown

    var field = input.closest(".field") || input.parentElement;
    field.classList.add("cat-combo-field");
    var drop = document.createElement("div");
    drop.className = "cat-combo-list";
    field.appendChild(drop);
    var open = false;

    function rowsHTML() {
      var cats = S.categories();
      var q = input.value.trim();
      var ql = q.toLowerCase();
      var exact = cats.some(function (c) { return c.toLowerCase() === ql; });
      var rows = [];
      if (q !== "" && !exact) {
        rows.push('<button type="button" class="cat-combo-row is-new" data-cat="' + U.esc(q) + '">' +
          '<span class="plus">+</span> Add new category &ldquo;' + U.esc(q) + '&rdquo;</button>');
      }
      cats.filter(function (c) { return c.toLowerCase().indexOf(ql) !== -1; }).forEach(function (c) {
        rows.push('<button type="button" class="cat-combo-row" data-cat="' + U.esc(c) + '">' + U.esc(c) + "</button>");
      });
      if (!rows.length) rows = ['<div class="cat-combo-empty">No categories yet</div>'];
      return rows.join("");
    }

    function paint() {
      drop.innerHTML = open ? rowsHTML() : "";
      drop.classList.toggle("open", open);
    }

    function pick(value) {
      input.value = value;
      open = false;
      paint();
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
    }

    input.addEventListener("focus", function () { open = true; paint(); });
    input.addEventListener("input", function () { open = true; paint(); });
    input.addEventListener("blur", function () {
      setTimeout(function () { open = false; paint(); }, 120);
    });

    drop.addEventListener("mousedown", function (e) {
      var btn = e.target.closest(".cat-combo-row");
      if (!btn) return;
      e.preventDefault(); // keep the input focused
      pick(btn.getAttribute("data-cat"));
    });
  }

  function methodLabel(m) {
    if (m === "Bank") return "Bank transfer";
    if (m === "Cheque") return "Bank cheque";
    return m || "Cash";
  }

  function methodBadge(m) {
    var map = { Cash: "ok", Card: "info", Credit: "warn", Bank: "info", Cheque: "outline" };
    return '<span class="badge ' + (map[m] || "outline") + '">' + U.esc(methodLabel(m)) + "</span>";
  }

  function billStatus(b) {
    if (b.balance > 0.009) {
      return b.paid > 0
        ? '<span class="badge warn">Partial</span>'
        : '<span class="badge danger">Credit</span>';
    }
    return '<span class="badge ok">Paid</span>';
  }

  function itemCount(b) {
    return (b.lines || []).reduce(function (s, l) { return s + (l.qty || 0); }, 0);
  }

  function itemsLabel(n) {
    return U.num(n) + (Number(n) === 1 ? " item" : " items");
  }

  function niceMax(v) {
    if (!v || v <= 0) return 1000;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  function shortMoney(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 ? 1 : 0) + "M";
    if (v >= 1000) return (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k";
    return String(Math.round(v));
  }

  function hourLabel(h) {
    if (h === 0) return "12a";
    if (h === 12) return "12p";
    return (h > 12 ? h - 12 : h) + (h < 12 ? "a" : "p");
  }

  function smoothPath(pts) {
    if (!pts.length) return "";
    if (pts.length === 1) return "M " + pts[0].x + " " + pts[0].y;
    var d = "M " + pts[0].x + " " + pts[0].y;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6;
      var c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6;
      var c2y = p2.y - (p3.y - p1.y) / 6;
      d += " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;
    }
    return d;
  }

  function hourlyChart(values) {
    var total = values.reduce(function (a, b) { return a + b; }, 0);
    if (!total) {
      return emptyState("chart", "No sales in this period", "Complete a bill and the hourly pattern will appear here.");
    }

    var w = 720, h = 236, pl = 46, pr = 12, pt = 16, pb = 28;
    var max = niceMax(Math.max.apply(null, values));
    var pw = w - pl - pr, ph = h - pt - pb;
    var x = function (i) { return pl + (i / 23) * pw; };
    var y = function (v) { return pt + ph - (v / max) * ph; };

    var pts = values.map(function (v, i) { return { x: x(i), y: y(v), v: v, i: i }; });
    var line = smoothPath(pts);
    var area = line + " L " + x(23) + " " + (pt + ph) + " L " + x(0) + " " + (pt + ph) + " Z";

    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var gv = (max * g) / 4;
      var gy = y(gv);
      grid += '<line class="grid-line" x1="' + pl + '" y1="' + gy + '" x2="' + (w - pr) + '" y2="' + gy + '"/>';
      grid += '<text class="axis-label" x="' + (pl - 8) + '" y="' + (gy + 3) + '" text-anchor="end">' + shortMoney(gv) + "</text>";
    }

    var labels = "";
    [0, 4, 8, 12, 16, 20].forEach(function (hr) {
      labels += '<text class="axis-label" x="' + x(hr) + '" y="' + (h - 6) + '" text-anchor="middle">' + hourLabel(hr) + "</text>";
    });

    var dots = pts.filter(function (p) { return p.v > 0; }).map(function (p) {
      return '<circle class="dot" cx="' + p.x + '" cy="' + p.y + '" r="2.6"><title>' +
        hourLabel(p.i) + " · " + U.money(p.v) + "</title></circle>";
    }).join("");

    return '<div class="chart-shell"><svg class="chart-svg" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Hourly sales">' +
      '<defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" style="stop-color:var(--accent);stop-opacity:.30"/>' +
      '<stop offset="100%" style="stop-color:var(--accent);stop-opacity:0"/>' +
      "</linearGradient></defs>" +
      grid +
      '<path class="area" d="' + area + '"/>' +
      '<path class="line" d="' + line + '"/>' +
      dots + labels +
      "</svg></div>";
  }

  /* ============================================================
     Overview
     ============================================================ */

  var overviewRange = "today";

  views.overview = {
    title: "POS Sales Overview",
    subtitle: "Real-time terminal summary and billing activities",

    render: function () {
      var range = S.rangeFor(overviewRange);
      var bills = S.billsBetween(range.from, range.to);
      var sum = S.summarize(bills);
      var days = overviewRange === "month"
        ? Math.max(1, Math.round((range.to - range.from) / 86400000))
        : overviewRange === "week" ? 7 : 1;
      var target = (Number(S.db.shop.target) || 0) * days;
      var pct = target > 0 ? Math.min(100, (sum.total / target) * 100) : 0;
      var low = S.lowStock();
      var outOfStock = low.filter(function (i) { return Number(i.qty) <= 0; }).length;
      var hourly = S.hourly(bills);
      var top = S.topItems(bills, 6);
      var maxTop = top.length ? top[0].revenue : 1;
      var recent = S.db.bills.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 6);

      var periodBtns = [
        ["today", "Today"],
        ["week", "7 days"],
        ["month", "This month"],
      ].map(function (r) {
        return '<button data-range="' + r[0] + '" class="' + (overviewRange === r[0] ? "active" : "") + '">' + r[1] + "</button>";
      }).join("");

      var topRows = top.map(function (t, i) {
        return '<div class="top-item">' +
          '<div class="top-rank">' + (i + 1) + "</div>" +
          '<div class="top-meta">' +
          '<div class="top-name">' + U.esc(t.name) + "</div>" +
          '<div class="top-sub">' + U.num(t.qty) + " sold</div>" +
          '<div class="mini-bar"><span style="width:' + Math.max(4, (t.revenue / maxTop) * 100) + '%"></span></div>' +
          "</div>" +
          '<div class="top-value">' + U.money(t.revenue) + "</div>" +
          "</div>";
      }).join("");

      var recentRows = recent.map(function (b) {
        return "<tr>" +
          '<td class="strong mono">' + U.esc(b.no) + "</td>" +
          "<td>" + U.esc(b.customerName) + "</td>" +
          '<td class="num">' + U.num(itemCount(b)) + "</td>" +
          '<td class="num strong">' + U.money(b.total) + "</td>" +
          "<td>" + billStatus(b) + "</td>" +
          "</tr>";
      }).join("");

      return '<div class="stack">' +

        // period + KPI
        '<div class="row-between">' +
        '<div class="segmented">' + periodBtns + "</div>" +
        '<span class="badge outline">' + U.dateShort(range.from) +
        (overviewRange === "today" ? "" : " – " + U.dateShort(range.to - 1)) + "</span>" +
        "</div>" +

        '<div class="grid grid-kpi">' +

        '<div class="kpi">' +
        '<div class="kpi-label">Total revenue</div>' +
        '<div class="kpi-value"><span class="unit">' + U.esc(S.db.shop.currency) + "</span>" + amount(sum.total) + "</div>" +
        '<div class="kpi-foot">Received <strong>' + U.money(sum.paid) + "</strong>" +
        (sum.balance > 0 ? ' · <span class="neg">' + U.money(sum.balance) + " credit</span>" : "") + "</div>" +
        "</div>" +

        '<div class="kpi">' +
        '<div class="kpi-label">Bills processed</div>' +
        '<div class="kpi-value">' + U.num(sum.count, 0) + "</div>" +
        '<div class="kpi-foot">Avg <strong>' + U.money(sum.avg) + "</strong> per bill</div>" +
        "</div>" +

        '<div class="kpi">' +
        '<div class="kpi-label">Target progress</div>' +
        '<div class="kpi-value">' + Math.round(pct) + "%</div>" +
        '<div class="kpi-progress"><span style="width:' + pct + '%"></span></div>' +
        '<div class="kpi-foot">' + U.money(sum.total) + " of <strong>" + U.money(target) + "</strong></div>" +
        "</div>" +

        '<div class="kpi">' +
        '<div class="kpi-label">Low stock items</div>' +
        '<div class="kpi-value">' + U.num(low.length, 0) + " <span class='unit'>items</span></div>" +
        '<div class="kpi-foot">' + (low.length
          ? '<span class="' + (outOfStock ? "neg" : "pos") + '">' + (outOfStock ? outOfStock + " out of stock" : "Reorder soon") + "</span>"
          : '<span class="pos">Stock is healthy</span>') + "</div>" +
        "</div>" +

        "</div>" +

        // chart + top
        '<div class="grid grid-main">' +
        '<div class="card">' +
        head("Peak hours", "Hourly sales in the selected period",
          '<span class="badge outline">' + U.esc(range.label) + "</span>") +
        '<div class="card-body">' + hourlyChart(hourly) + "</div>" +
        "</div>" +

        '<div class="card">' +
        head("Top selling items", "By revenue in the selected period") +
        '<div class="card-body">' +
        (top.length ? '<div class="top-list">' + topRows + "</div>"
          : emptyState("tag", "No sales yet", "Top products will rank here automatically.")) +
        "</div>" +
        "</div>" +
        "</div>" +

        // recent
        '<div class="card">' +
        head("Recent completed bills", "Live order stream from this counter",
          '<button class="btn btn-ghost btn-sm" data-go="transactions">View all ' + UI.icon("arrowRight", 15) + "</button>") +
        '<div class="card-body flush">' +
        (recent.length
          ? '<div class="table-wrap"><table class="data compact"><thead><tr>' +
          "<th>Bill</th><th>Customer</th><th class='num'>Items</th><th class='num'>Total</th><th>Status</th>" +
          "</tr></thead><tbody>" + recentRows + "</tbody></table></div>"
          : emptyState("receipt", "No bills yet", "Your first sale will show up here.", "")) +
        "</div>" +
        "</div>" +

        "</div>";
    },

    mount: function (root) {
      root.querySelectorAll("[data-range]").forEach(function (b) {
        b.addEventListener("click", function () {
          overviewRange = b.getAttribute("data-range");
          global.POS.app.refresh();
        });
      });
      var go = root.querySelector("[data-go]");
      if (go) go.addEventListener("click", function () { global.POS.app.go("transactions"); });
    },
  };

  /* ============================================================
     Billing
     ============================================================ */

  var cart = [];
  var billCustomerId = null;
  var billCustomerQuery = "";
  var billCustomerOpen = false;
  var billSearch = "";

  var BANKS = [
    "Bank of Ceylon", "Commercial Bank", "Sampath Bank", "Hatton National Bank",
    "People's Bank", "Nations Trust Bank", "Seylan Bank", "DFCC Bank",
    "NDB Bank", "Standard Chartered", "HSBC", "Union Bank", "Pan Asia Bank",
    "Amana Bank", "Cargills Bank", "Sanasa Development Bank",
  ];

  function cartCount() {
    return cart.reduce(function (s, l) { return s + l.qty; }, 0);
  }

  function cartTotals() {
    var subtotal = cart.reduce(function (s, l) { return s + l.price * l.qty; }, 0);
    return { subtotal: subtotal, count: cartCount() };
  }

  function productSearchText(it) {
    return (it.name + " " + it.category + " " + it.id).toLowerCase();
  }

  function productsHTML() {
    var q = billSearch.trim().toLowerCase();
    var items = S.items().filter(function (it) {
      return !q || productSearchText(it).indexOf(q) !== -1;
    });

    if (!items.length) {
      return emptyState("search", "No matching items", "Try another name or category, or add a new item.", "");
    }

    return items.map(function (it) {
      var stock = Number(it.qty) || 0;
      var cls = stock <= 0 ? "out" : stock <= it.reorder ? "low" : "";
      return '<button type="button" class="product-tile" data-add="' + it.id + '"' + (stock <= 0 ? " disabled" : "") + ">" +
        '<span class="pt-add">' + UI.icon("plus", 13) + "</span>" +
        '<span class="pt-name">' + U.esc(it.name) + "</span>" +
        '<span class="pt-price">' + U.money(it.price) + "</span>" +
        '<span class="pt-stock ' + cls + '">' + (stock <= 0 ? "Out of stock" : U.num(stock) + " " + U.esc(it.unit) + " left") + "</span>" +
        "</button>";
    }).join("");
  }

  function cartHTML() {
    if (!cart.length) {
      return emptyState("cart", "Cart is empty", "Tap a product above or search for it by name.");
    }
    return '<div class="cart-list">' + cart.map(function (l) {
      return '<div class="cart-row">' +
        "<div>" +
        '<div class="cart-name">' + U.esc(l.name) + "</div>" +
        '<div class="cart-meta">' + U.money(l.price) + " · " + U.num(l.qty) + " " + U.esc(l.unit) + "</div>" +
        "</div>" +
        '<div class="qty-control">' +
        '<button type="button" data-qty="-1" data-id="' + l.itemId + '" aria-label="Decrease">' +
        (l.qty <= 1 ? UI.icon("trash", 13) : UI.icon("minus", 13)) + "</button>" +
        '<input type="number" min="0" step="0.01" data-set-qty="' + l.itemId + '" value="' + l.qty + '" class="qty-input" aria-label="Quantity">' +
        '<span class="qty-val">' + U.num(l.qty) + "</span>" +
        '<button type="button" data-qty="1" data-id="' + l.itemId + '" aria-label="Increase">' + UI.icon("plus", 13) + "</button>" +
        "</div>" +
        '<div class="cart-line-total">' + U.money(l.price * l.qty) + "</div>" +
        "</div>";
    }).join("") + "</div>";
  }

  function selectedCustomer() {
    return billCustomerId ? S.customer(billCustomerId) : null;
  }

  function customerMenuHTML() {
    var q = billCustomerQuery.trim().toLowerCase();
    var list = S.customers().filter(function (c) {
      return !q || (c.name + " " + (c.phone || "") + " " + (c.address || "")).toLowerCase().indexOf(q) !== -1;
    });
    var html = "";

    if (!q) {
      html += '<button type="button" class="customer-option' + (!billCustomerId ? " active" : "") + '" data-pick-customer="">' +
        '<span class="co-avatar">' + UI.icon("user", 14) + "</span>" +
        '<span class="co-meta"><span class="co-name">Walk-in customer</span><span class="co-sub">No customer selected</span></span>' +
        (billCustomerId ? "" : '<span class="co-check">' + UI.icon("check", 14) + "</span>") +
        "</button>";
    }

    if (!list.length) {
      html += '<div class="customer-empty">No saved customer matches “' + U.esc(billCustomerQuery.trim()) + '”.</div>';
    } else {
      html += list.map(function (c) {
        var sub = c.phone || c.address || "Saved customer";
        if (c.note) sub += " · Note: " + c.note.replace(/\s+/g, " ").slice(0, 60);
        return '<button type="button" class="customer-option' + (billCustomerId === c.id ? " active" : "") + '" data-pick-customer="' + c.id + '">' +
          '<span class="co-avatar">' + U.esc(UI.initials(c.name)) + "</span>" +
          '<span class="co-meta"><span class="co-name">' + U.esc(c.name) + "</span>" +
          '<span class="co-sub">' + U.esc(sub) + "</span></span>" +
          (billCustomerId === c.id ? '<span class="co-check">' + UI.icon("check", 14) + "</span>" : "") +
          "</button>";
      }).join("");
    }
    return html;
  }

  function summaryHTML() {
    var t = cartTotals();
    var selected = selectedCustomer();
    var inputVal = billCustomerOpen ? billCustomerQuery : (selected ? selected.name : "");

    return '<div class="field customer-field">' +
      '<label for="bill-customer-search">Customer</label>' +
      '<div class="customer-picker">' +
      '<div class="customer-input-row">' +
      '<div class="input-icon">' + UI.icon("search", 16) +
      '<input class="input" id="bill-customer-search" type="search" role="combobox" aria-expanded="' + (billCustomerOpen ? "true" : "false") + '" aria-controls="customer-menu" aria-autocomplete="list" autocomplete="off" placeholder="Search saved customers…" value="' + U.esc(inputVal) + '">' +
      "</div>" +
      '<button class="btn-icon" data-new-customer title="New customer" aria-label="New customer">' + UI.icon("plus", 17) + "</button>" +
      "</div>" +
      '<div class="customer-menu" id="customer-menu"' + (billCustomerOpen ? "" : " hidden") + ">" + customerMenuHTML() + "</div>" +
      "</div>" +
      (selected && selected.note
        ? '<div class="small" style="margin-top:8px;background:var(--surface-2);border-left:3px solid var(--accent);border-radius:6px;padding:7px 9px"><strong>Note:</strong> ' + U.esc(selected.note).replace(/\n/g, "<br>") + "</div>"
        : "") +
      "</div>" +
      '<div style="margin-top:16px">' +
      '<div class="summary-line"><span>Items</span><strong>' + U.num(t.count) + "</strong></div>" +
      '<div class="summary-line"><span>Subtotal</span><strong>' + U.money(t.subtotal) + "</strong></div>" +
      "</div>" +
      '<div class="summary-total">' +
      '<span class="st-label">Total due</span>' +
      '<span class="st-value">' + U.money(t.subtotal) + "</span>" +
      "</div>" +
      '<button class="btn btn-primary btn-lg btn-block" data-charge style="margin-top:14px"' + (cart.length ? "" : " disabled") + ">" +
      UI.icon("wallet", 17) + " Charge" + (cart.length ? " " + U.money(t.subtotal) : "") + "</button>" +
      '<button class="btn btn-ghost btn-block" data-clear style="margin-top:6px"' + (cart.length ? "" : " disabled") + ">Clear bill</button>";
  }

  function stickyHTML() {
    var t = cartTotals();
    return '<div class="sc-meta"><span>' + itemsLabel(t.count) + "</span><strong>" + U.money(t.subtotal) + "</strong></div>" +
      '<button class="btn btn-primary" data-charge style="margin-left:auto">' + UI.icon("wallet", 16) + " Charge</button>";
  }

  function paintProducts() {
    var el = document.getElementById("product-grid");
    if (el) el.innerHTML = productsHTML();
  }

  function paintCart() {
    var body = document.getElementById("cart-body");
    if (body) body.innerHTML = cartHTML();
    var count = document.getElementById("cart-count");
    if (count) count.textContent = itemsLabel(cartCount());
    var sum = document.getElementById("bill-summary");
    if (sum) sum.innerHTML = summaryHTML();
    var sticky = document.getElementById("sticky-charge");
    if (sticky) {
      sticky.className = "sticky-charge" + (cart.length ? " show" : "");
      sticky.innerHTML = cart.length ? stickyHTML() : "";
    }
    var empty = document.getElementById("billing-empty-hint");
    if (empty) empty.style.display = cart.length ? "none" : "";
  }

  function addToCart(itemId, qty) {
    var it = S.item(itemId);
    if (!it || it.active === false) return;
    qty = Number(qty) || 1;
    var line = cart.filter(function (l) { return l.itemId === itemId; })[0];
    var inCart = line ? line.qty : 0;
    var stockQty = U.qtyToStockUnit(inCart + qty, it.unit, it.unit);
    if (stockQty == null || Number(it.qty) < stockQty) {
      UI.toast("Only " + U.num(it.qty) + " " + it.unit + " of " + it.name + " in stock.", "warn");
      return;
    }
    if (line) line.qty += qty;
    else cart.push({ itemId: it.id, name: it.name, price: it.price, cost: it.cost, unit: it.unit, qty: qty });
    paintProducts();
    paintCart();
  }

  function changeQty(itemId, delta) {
    var line = cart.filter(function (l) { return l.itemId === itemId; })[0];
    if (!line) return;
    var it = S.item(itemId);
    var newQty = Number(line.qty) + delta;
    if (delta > 0 && it) {
      var stockQty = U.qtyToStockUnit(newQty, line.unit, it.unit);
      if (stockQty == null) {
        UI.toast("Stock unit mismatch for " + it.name + ".", "warn");
        return;
      }
      if (Number(it.qty) < stockQty) {
        UI.toast("No more stock available.", "warn");
        return;
      }
    }
    line.qty = Math.max(0, newQty);
    if (line.qty <= 0) cart = cart.filter(function (l) { return l.itemId !== itemId; });
    paintProducts();
    paintCart();
  }

  function openCharge() {
    if (!cart.length) return;
    if (!S.dayOpen()) {
      UI.toast("Start the day before taking payments.", "warn");
      return;
    }

    var t = cartTotals();
    var method = "Cash";
    var printed = true;
    var saveFile = false;

    var body = '<div style="text-align:center;padding:2px 0 16px">' +
      '<div class="small muted">Amount payable</div>' +
      '<div id="pay-total" style="font-size:36px;font-weight:780;letter-spacing:-.05em;line-height:1.15">' + U.money(t.subtotal) + "</div>" +
      '<div class="small muted">' + itemsLabel(t.count) + " · " + U.esc(S.nextBillNo()) + "</div>" +
      "</div>" +

      '<div class="field"><span class="field-label">Payment method</span>' +
      '<div class="pay-methods" id="pay-methods">' +
      '<button type="button" data-method="Cash" class="active">' + UI.icon("cash", 15) + " Cash</button>" +
      '<button type="button" data-method="Card">' + UI.icon("card", 15) + " Card</button>" +
      '<button type="button" data-method="Bank">' + UI.icon("bank", 15) + " Bank</button>" +
      '<button type="button" data-method="Cheque">' + UI.icon("cheque", 15) + " Bank cheque</button>" +
      '<button type="button" data-method="Credit">' + UI.icon("receipt", 15) + " Credit</button>" +
      "</div></div>" +

      '<div class="pay-extra" id="pay-bank-fields" hidden>' +
      '<div class="field"><label for="pay-bank">Bank name *</label>' +
      '<input class="input" id="pay-bank" list="pay-bank-list" placeholder="e.g. Commercial Bank" autocomplete="off">' +
      '<datalist id="pay-bank-list">' + BANKS.map(function (b) { return '<option value="' + U.esc(b) + '">'; }).join("") + "</datalist></div>" +
      '<div class="field" id="pay-cheque-field" hidden><label for="pay-cheque">Cheque number *</label>' +
      '<input class="input" id="pay-cheque" placeholder="e.g. 004512" autocomplete="off"></div>' +
      "</div>" +

      '<div class="form-grid" style="margin-top:14px">' +
      '<div class="field"><label>Discount</label><input class="input" id="pay-discount" type="number" min="0" step="1" value="0" inputmode="decimal"></div>' +
      '<div class="field"><label>Customer paid</label><input class="input" id="pay-paid" type="number" min="0" step="1" value="' + t.subtotal + '" inputmode="decimal" data-autofocus></div>' +
      "</div>" +

      '<div class="row" style="gap:6px;margin-top:10px" id="pay-chips">' +
      '<button type="button" class="btn btn-sm" data-chip="exact">Exact</button>' +
      [500, 1000, 2000, 5000].map(function (v) {
        return '<button type="button" class="btn btn-sm" data-chip="' + v + '">' + U.num(v, 0) + "</button>";
      }).join("") +
      "</div>" +

      '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--border-strong)">' +
      '<div class="summary-line"><span>Balance due</span><strong id="pay-balance">Rs. 0.00</strong></div>' +
      '<div class="summary-line"><span>Change</span><strong id="pay-change">Rs. 0.00</strong></div>' +
      "</div>" +
      '<div id="pay-hint" class="small muted" style="margin-top:4px"></div>' +
      '<label class="check" style="margin-top:14px"><input type="checkbox" id="pay-print" checked> Print receipt after saving</label>' +
      '<label class="check" style="margin-top:8px"><input type="checkbox" id="pay-download"> Save bill as a file too</label>' +
      '<div class="auth-error" id="pay-error"></div>';

    UI.modal({
      title: "Take payment",
      subtitle: itemsLabel(t.count) + " · " + (billCustomerId ? (S.customer(billCustomerId) || {}).name : "Walk-in customer"),
      body: body,
      footer: '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn-primary" id="pay-complete">' + UI.icon("check", 17) + " Complete sale</button>",
      onMount: function (overlay) {
        var totalEl = overlay.querySelector("#pay-total");
        var discInput = overlay.querySelector("#pay-discount");
        var paidInput = overlay.querySelector("#pay-paid");
        var balanceEl = overlay.querySelector("#pay-balance");
        var changeEl = overlay.querySelector("#pay-change");
        var hintEl = overlay.querySelector("#pay-hint");
        var errorEl = overlay.querySelector("#pay-error");
        var methods = overlay.querySelectorAll("[data-method]");
        var bankWrap = overlay.querySelector("#pay-bank-fields");
        var bankInput = overlay.querySelector("#pay-bank");
        var chequeField = overlay.querySelector("#pay-cheque-field");
        var chequeInput = overlay.querySelector("#pay-cheque");

        function syncMethodFields() {
          var needsBank = method === "Bank" || method === "Cheque";
          bankWrap.hidden = !needsBank;
          chequeField.hidden = method !== "Cheque";
        }

        function payable() {
          var d = Math.max(0, Number(discInput.value) || 0);
          return Math.max(0, t.subtotal - Math.min(d, t.subtotal));
        }

        function recalc() {
          var p = payable();
          var paid = Math.max(0, Number(paidInput.value) || 0);
          var balance = Math.max(0, p - paid);
          var change = Math.max(0, paid - p);

          totalEl.textContent = U.money(p);
          balanceEl.textContent = U.money(balance);
          changeEl.textContent = U.money(change);
          balanceEl.className = balance > 0 ? "neg" : "";
          changeEl.className = change > 0 ? "pos" : "";

          if (balance > 0) {
            hintEl.innerHTML = billCustomerId
              ? "The balance will be saved as credit for " + U.esc((S.customer(billCustomerId) || {}).name) + "."
              : '<span class="neg">Choose a customer to keep this as credit.</span>';
          } else {
            hintEl.textContent = "";
          }
        }

        methods.forEach(function (btn) {
          btn.addEventListener("click", function () {
            methods.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            method = btn.getAttribute("data-method");
            if (method === "Credit") {
              paidInput.value = 0;
              paidInput.disabled = true;
            } else {
              paidInput.disabled = false;
              if (!Number(paidInput.value)) paidInput.value = payable().toFixed(0);
            }
            syncMethodFields();
            recalc();
          });
        });

        overlay.querySelectorAll("[data-chip]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var chip = btn.getAttribute("data-chip");
            paidInput.value = chip === "exact" ? payable().toFixed(0) : chip;
            recalc();
          });
        });

        discInput.addEventListener("input", recalc);
        paidInput.addEventListener("input", recalc);
        paidInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            var btn = overlay.querySelector("#pay-complete");
            if (btn) btn.click();
          }
        });
        overlay.querySelector("#pay-print").addEventListener("change", function (e) {
          printed = e.target.checked;
        });
        overlay.querySelector("#pay-download").addEventListener("change", function (e) {
          saveFile = e.target.checked;
        });

        overlay.querySelector("#pay-complete").addEventListener("click", function () {
          errorEl.classList.remove("show");
          var p = payable();
          var paid = method === "Credit" ? 0 : Math.max(0, Number(paidInput.value) || 0);
          var bankName = bankInput ? bankInput.value.trim() : "";
          var chequeNo = chequeInput ? chequeInput.value.trim() : "";

          if (method === "Bank" || method === "Cheque") {
            if (!bankName) {
              errorEl.innerHTML = UI.icon("alertCircle", 15) + " Enter the bank name for this payment.";
              errorEl.classList.add("show");
              bankInput.focus();
              return;
            }
          }
          if (method === "Cheque" && !chequeNo) {
            errorEl.innerHTML = UI.icon("alertCircle", 15) + " Enter the cheque number for this payment.";
            errorEl.classList.add("show");
            chequeInput.focus();
            return;
          }
          if (paid < p && !billCustomerId) {
            errorEl.innerHTML = UI.icon("alertCircle", 15) + " Choose a customer before leaving a balance due.";
            errorEl.classList.add("show");
            return;
          }
          if (method === "Credit" && !billCustomerId) {
            errorEl.innerHTML = UI.icon("alertCircle", 15) + " Credit sales need a customer.";
            errorEl.classList.add("show");
            return;
          }

          var payBtn = overlay.querySelector("#pay-complete");
          payBtn.disabled = true;

          S.createBill({
            customerId: billCustomerId,
            lines: cart.map(function (l) {
              return { itemId: l.itemId, name: l.name, unit: l.unit, price: l.price, cost: l.cost, qty: l.qty };
            }),
            paid: paid,
            discount: Math.min(Number(discInput.value) || 0, t.subtotal),
            method: method,
            bankName: bankName,
            chequeNo: chequeNo,
          }).then(function (res) {
            if (res.error) {
              payBtn.disabled = false;
              errorEl.innerHTML = UI.icon("alertCircle", 15) + " " + U.esc(res.error);
              errorEl.classList.add("show");
              return;
            }

            var bill = res.bill;
            var chosenCustomerId = billCustomerId;
            cart = [];
            billCustomerId = null;
            UI.closeModal();
            UI.toast("Bill " + bill.no + " saved · " + U.money(bill.total), "ok");
            if (chosenCustomerId) {
              var sel = S.customer(chosenCustomerId);
              if (sel) {
                bill.customerAddress = sel.address || "";
                bill.customerNote = sel.note || "";
              }
            }
            if (printed) UI.printReceipt(bill);
            if (saveFile) UI.downloadReceipt(bill);
            global.POS.app.refresh();
          });
        });

        syncMethodFields();
        recalc();
      },
    });
  }

  /* ---------- item & customer quick modals ---------- */

  function openItemModal(item, onSaved) {
    var isEdit = !!item;
    var units = ["pcs", "pack", "kg", "g", "ltr", "ml", "box", "dozen"];

    UI.modal({
      title: isEdit ? "Edit item" : "New item",
      subtitle: "Stock, cost and selling price",
      body:
        '<div class="form-grid">' +
        '<div class="field span-2"><label>Item name *</label><input class="input" id="m-item-name" value="' + U.esc(isEdit ? item.name : "") + '" placeholder="e.g. Aloe Face Wash" data-autofocus></div>' +
        '<div class="field"><label>Category</label><input class="input" id="m-item-cat" value="' + U.esc(isEdit ? item.category : "") + '" placeholder="Type to search or add a new category" autocomplete="off"></div>' +
        '<div class="field"><label>Sold by</label><select class="select" id="m-item-unit">' +
        units.map(function (u) { return '<option value="' + u + '"' + (isEdit && item.unit === u ? " selected" : "") + ">" + u + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="field"><label>Cost price</label><input class="input" id="m-item-cost" type="number" min="0" step="0.01" value="' + (isEdit ? item.cost : "") + '" inputmode="decimal"></div>' +
        '<div class="field"><label>Selling price</label><input class="input" id="m-item-price" type="number" min="0" step="0.01" value="' + (isEdit ? item.price : "") + '" inputmode="decimal"></div>' +
        '<div class="field"><label>Stock qty</label><input class="input" id="m-item-qty" type="number" min="0" step="0.01" value="' + (isEdit ? item.qty : "") + '" inputmode="decimal"></div>' +
        '<div class="field"><label>Reorder level</label><input class="input" id="m-item-reorder" type="number" min="0" step="1" value="' + (isEdit ? item.reorder : 5) + '" inputmode="numeric"></div>' +
        "</div>" +
        '<div class="auth-error" id="m-item-error"></div>',
      footer: '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn-primary" id="m-item-save">' + UI.icon("check", 16) + " Save item</button>",
      onMount: function (overlay) {
        categoryCombo(overlay.querySelector("#m-item-cat"));
        overlay.querySelector("#m-item-save").addEventListener("click", function () {
          var data = {
            name: overlay.querySelector("#m-item-name").value,
            category: overlay.querySelector("#m-item-cat").value,
            unit: overlay.querySelector("#m-item-unit").value,
            cost: overlay.querySelector("#m-item-cost").value,
            price: overlay.querySelector("#m-item-price").value,
            qty: overlay.querySelector("#m-item-qty").value,
            reorder: overlay.querySelector("#m-item-reorder").value,
          };
          var res = isEdit ? S.updateItem(item.id, data) : S.addItem(data);
          if (res.error) {
            var err = overlay.querySelector("#m-item-error");
            err.innerHTML = UI.icon("alertCircle", 15) + " " + U.esc(res.error);
            err.classList.add("show");
            return;
          }
          UI.closeModal();
          UI.toast(isEdit ? "Item updated." : "Item added.", "ok");
          if (onSaved) onSaved(res.item);
        });
      },
    });
  }

  function openCustomerModal(customer, onSaved) {
    var isEdit = !!customer;
    UI.modal({
      title: isEdit ? "Edit customer" : "New customer",
      subtitle: "Contact details and credit history",
      body:
        '<div class="form-grid">' +
        '<div class="field span-2"><label>Name *</label><input class="input" id="m-cus-name" value="' + U.esc(isEdit ? customer.name : "") + '" placeholder="Customer name" data-autofocus></div>' +
        '<div class="field"><label>Phone</label><input class="input" id="m-cus-phone" value="' + U.esc(isEdit ? customer.phone : "") + '" placeholder="07X XXX XXXX" inputmode="tel"></div>' +
        '<div class="field"><label>Address</label><input class="input" id="m-cus-address" value="' + U.esc(isEdit ? customer.address : "") + '" placeholder="City / area"></div>' +
        '<div class="field span-2"><label>Note</label><textarea class="input" id="m-cus-note" rows="3" placeholder="e.g. Prefers delivery on Fridays. Credit limit Rs. 10,000.">' + U.esc(isEdit ? (customer.note || "") : "") + "</textarea></div>" +
        "</div>" +
        '<div class="auth-error" id="m-cus-error"></div>',
      footer: '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn-primary" id="m-cus-save">' + UI.icon("check", 16) + " Save customer</button>",
      onMount: function (overlay) {
        overlay.querySelector("#m-cus-save").addEventListener("click", function () {
          var data = {
            name: overlay.querySelector("#m-cus-name").value,
            phone: overlay.querySelector("#m-cus-phone").value,
            address: overlay.querySelector("#m-cus-address").value,
            note: overlay.querySelector("#m-cus-note").value,
          };
          var res = isEdit ? S.updateCustomer(customer.id, data) : S.addCustomer(data);
          if (res.error) {
            var err = overlay.querySelector("#m-cus-error");
            err.innerHTML = UI.icon("alertCircle", 15) + " " + U.esc(res.error);
            err.classList.add("show");
            return;
          }
          UI.closeModal();
          UI.toast(isEdit ? "Customer updated." : "Customer added.", "ok");
          if (onSaved) onSaved(res.customer);
        });
      },
    });
  }

  views.billing = {
    title: "POS Billing",
    subtitle: "Create a bill, take payment and print it",

    render: function () {
      var dayClosed = !S.dayOpen();
      billCustomerOpen = false;
      billCustomerQuery = "";

      return '<div class="grid grid-billing">' +

        '<div class="stack">' +

        (dayClosed
          ? '<div class="card" style="border-color:var(--warn)"><div class="card-body row-between">' +
          '<div class="row"><span class="badge warn">Day closed</span><span class="small muted">Start the day to take payments.</span></div>' +
          '<button class="btn btn-accent btn-sm" data-start-day>' + UI.icon("sun", 15) + " Start day</button>" +
          "</div></div>"
          : "") +

        '<div class="card">' +
        head("Add items", "Search, then tap a product to add it",
          '<button class="btn btn-sm" data-new-item>' + UI.icon("plus", 15) + " New item</button>") +
        '<div class="card-body">' +
        '<div class="product-search-row">' +
        '<div class="input-icon">' + UI.icon("search", 17) +
        '<input class="input" id="product-search" type="search" placeholder="Search by name, category or id" value="' + U.esc(billSearch) + '" autocomplete="off">' +
        "</div>" +
        '<button class="btn btn-outline" id="search-clear">Clear</button>' +
        "</div>" +
        '<div class="product-grid" id="product-grid">' + productsHTML() + "</div>" +
        "</div>" +
        "</div>" +

        '<div class="card">' +
        head("Current bill", "Quantities can be changed before payment",
          '<span class="badge outline" id="cart-count">' + itemsLabel(cartCount()) + "</span>") +
        '<div class="card-body" id="cart-body">' + cartHTML() + "</div>" +
        "</div>" +

        "</div>" +

        '<aside class="billing-side">' +
        '<div class="card billing-summary-card">' +
        head("Bill summary", "Payment and customer", '<span class="badge outline">Counter ' + U.esc(S.db.counters.counter) + "</span>") +
        '<div class="card-body" id="bill-summary">' + summaryHTML() + "</div>" +
        "</div>" +
        '<div class="card" style="margin-top:14px">' +
        '<div class="card-body">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' +
        '<span style="color:var(--accent);margin-top:2px">' + UI.icon("info", 16) + "</span>" +
        '<p class="small muted" style="line-height:1.55">Tip: search an item and press <strong style="color:var(--text-2)">Enter</strong> to add the first match. Every completed bill updates stock and reports automatically.</p>' +
        "</div></div></div>" +
        "</aside>" +

        "</div>" +

        '<div class="sticky-charge' + (cart.length ? " show" : "") + '" id="sticky-charge">' + (cart.length ? stickyHTML() : "") + "</div>";
    },

    mount: function (root) {
      var search = root.querySelector("#product-search");
      var clearBtn = root.querySelector("#search-clear");

      function selectCustomer(id) {
        billCustomerId = id || null;
        billCustomerOpen = false;
        billCustomerQuery = "";
        paintCart();
      }

      function closeCustomerPicker() {
        if (!billCustomerOpen) return;
        billCustomerOpen = false;
        billCustomerQuery = "";
        var input = root.querySelector("#bill-customer-search");
        var menu = root.querySelector("#customer-menu");
        var selected = selectedCustomer();
        if (input) {
          input.value = selected ? selected.name : "";
          input.setAttribute("aria-expanded", "false");
        }
        if (menu) menu.hidden = true;
      }

      function openCustomerPicker() {
        if (billCustomerOpen) return;
        billCustomerOpen = true;
        billCustomerQuery = "";
        var input = root.querySelector("#bill-customer-search");
        var menu = root.querySelector("#customer-menu");
        if (input) {
          input.value = "";
          input.setAttribute("aria-expanded", "true");
        }
        if (menu) {
          menu.hidden = false;
          menu.innerHTML = customerMenuHTML();
        }
      }

      if (search) {
        search.addEventListener("input", function () {
          billSearch = search.value;
          paintProducts();
        });
        search.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            var first = document.querySelector("#product-grid .product-tile:not([disabled])");
            if (first) addToCart(first.getAttribute("data-add"));
          }
        });
        setTimeout(function () { if (window.innerWidth > 900) search.focus(); }, 80);
      }

      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          billSearch = "";
          if (search) { search.value = ""; search.focus(); }
          paintProducts();
        });
      }

      root.addEventListener("click", function (e) {
        if (billCustomerOpen && !e.target.closest(".customer-picker")) closeCustomerPicker();

        if (e.target.id === "bill-customer-search") { openCustomerPicker(); return; }

        var pick = e.target.closest("[data-pick-customer]");
        if (pick) { selectCustomer(pick.getAttribute("data-pick-customer")); return; }

        var add = e.target.closest("[data-add]");
        if (add) { addToCart(add.getAttribute("data-add")); return; }

        var qty = e.target.closest("[data-qty]");
        if (qty) { changeQty(qty.getAttribute("data-id"), Number(qty.getAttribute("data-qty"))); return; }

        var charge = e.target.closest("[data-charge]");
        if (charge) { openCharge(); return; }

        var clear = e.target.closest("[data-clear]");
        if (clear) {
          if (!cart.length) return;
          UI.confirm({
            title: "Clear this bill?",
            message: "All items will be removed from the current bill. Stock is not affected.",
            confirmText: "Clear bill",
            danger: true,
          }).then(function (ok) {
            if (ok) { cart = []; paintProducts(); paintCart(); UI.toast("Bill cleared."); }
          });
          return;
        }

        if (e.target.closest("[data-new-item]")) {
          openItemModal(null, function () {
            paintProducts();
            global.POS.app.refresh();
          });
          return;
        }

        if (e.target.closest("[data-new-customer]")) {
          billCustomerOpen = false;
          billCustomerQuery = "";
          openCustomerModal(null, function (c) {
            billCustomerId = c.id;
            paintCart();
          });
          return;
        }

        if (e.target.closest("[data-start-day]")) {
          S.startDay();
          UI.toast("Day started. Happy selling!", "ok");
          global.POS.app.refresh();
          return;
        }
      });

      /* Exact quantity entry (e.g. 250 g, 0.5 kg). Stock is checked in the
         item's stock unit, so kg/g and ltr/ml sell correctly. */
      root.addEventListener("change", function (e) {
        var set = e.target.closest("[data-set-qty]");
        if (set && e.target.tagName === "INPUT") {
          var itemId = set.getAttribute("data-set-qty");
          var line = cart.filter(function (l) { return l.itemId === itemId; })[0];
          if (!line) return;
          var it = S.item(itemId);
          var newQty = Math.max(0, Number(e.target.value) || 0);
          var stockQty = U.qtyToStockUnit(newQty, line.unit, it ? it.unit : "pcs");
          if (it && (stockQty == null || Number(it.qty) < stockQty)) {
            UI.toast("Only " + U.num(it.qty) + " " + it.unit + " of " + it.name + " in stock.", "warn");
            e.target.select();
            return;
          }
          line.qty = newQty;
          if (line.qty <= 0) cart = cart.filter(function (l) { return l.itemId !== itemId; });
          paintProducts();
          paintCart();
        }
      });

      root.addEventListener("focusin", function (e) {
        if (e.target.id === "bill-customer-search") openCustomerPicker();
      });

      root.addEventListener("input", function (e) {
        if (e.target.id === "bill-customer-search") {
          billCustomerQuery = e.target.value;
          var menu = root.querySelector("#customer-menu");
          if (menu) { menu.hidden = false; menu.innerHTML = customerMenuHTML(); }
        }
      });

      root.addEventListener("keydown", function (e) {
        if (e.target.id !== "bill-customer-search") return;
        if (e.key === "Escape") {
          e.preventDefault();
          closeCustomerPicker();
          e.target.blur();
        } else if (e.key === "Enter") {
          e.preventDefault();
          var first = root.querySelector("#customer-menu [data-pick-customer]");
          if (first) selectCustomer(first.getAttribute("data-pick-customer"));
        }
      });

      root.addEventListener("focusout", function (e) {
        if (e.target.id !== "bill-customer-search") return;
        setTimeout(function () {
          var picker = root.querySelector(".customer-picker");
          if (billCustomerOpen && (!picker || !picker.contains(document.activeElement))) {
            closeCustomerPicker();
          }
        }, 140);
      });
    },
  };

  /* ============================================================
     Transactions
     ============================================================ */

  var txSearch = "";
  var txSelected = {};

  function txFiltered() {
    var q = txSearch.trim().toLowerCase();
    return S.db.bills.slice().sort(function (a, b) { return b.ts - a.ts; }).filter(function (b) {
      if (!q) return true;
      return (b.no + " " + b.customerName + " " + U.dateShort(b.ts) + " " + U.dateKey(b.ts) + " " + (b.method || "") + " " + (b.bankName || "") + " " + (b.chequeNo || ""))
        .toLowerCase().indexOf(q) !== -1;
    });
  }

  function txRowsHTML() {
    var bills = txFiltered();
    if (!bills.length) {
      return '<tr><td colspan="9">' + emptyState("receipt", txSearch ? "No matching bills" : "No bills yet",
        txSearch ? "Try a different bill number, customer or date." : "Completed sales will be listed here.") + "</td></tr>";
    }
    return bills.map(function (b) {
      var sel = !!txSelected[b.id];
      return '<tr class="' + (sel ? "selected" : "") + '">' +
        '<td style="width:36px"><input type="checkbox" class="tx-check" data-id="' + b.id + '"' + (sel ? " checked" : "") + " aria-label='Select " + U.esc(b.no) + "'></td>" +
        '<td class="strong mono">' + U.esc(b.no) + "</td>" +
        '<td class="mono nowrap">' + U.dateTime(b.ts) + "</td>" +
        "<td>" + U.esc(b.customerName) + "</td>" +
        "<td>" + methodBadge(b.method) + "</td>" +
        '<td class="num">' + U.num(itemCount(b)) + "</td>" +
        '<td class="num strong">' + U.money(b.total) + "</td>" +
        '<td class="num">' + U.money(b.paid) + "</td>" +
        '<td class="num">' + (b.balance > 0 ? '<span class="neg">' + U.money(b.balance) + "</span>" : U.money(0)) + "</td>" +
        "</tr>";
    }).join("");
  }

  function openBillModal(bill, onChanged) {
    var bal = Math.max(0, bill.balance || 0);
    var cust = bill.customerId ? S.customer(bill.customerId) : null;
    var display = Object.assign({}, bill);
    if (cust) {
      display.customerAddress = cust.address || "";
      display.customerNote = cust.note || "";
    }
    UI.modal({
      title: "Bill " + bill.no,
      subtitle: U.dateTime(bill.ts) + " · " + bill.customerName,
      body: '<div class="receipt-preview">' + UI.receiptBody(display) + "</div>",
      footer: '<button class="btn" data-close>Close</button>' +
        (bal > 0 ? '<button class="btn btn-outline" id="bill-pay">' + UI.icon("wallet", 16) + " Record payment</button>" : "") +
        '<button class="btn btn-outline" id="bill-download">' + UI.icon("download", 16) + " Save file</button>" +
        '<button class="btn btn-primary" id="bill-print">' + UI.icon("printer", 16) + " Print</button>",
      onMount: function (overlay) {
        overlay.querySelector("#bill-print").addEventListener("click", function () {
          UI.printReceipt(display);
        });
        overlay.querySelector("#bill-download").addEventListener("click", function () {
          UI.downloadReceipt(display);
        });
        var payBtn = overlay.querySelector("#bill-pay");
        if (payBtn) {
          payBtn.addEventListener("click", function () {
            UI.closeModal();
            openPaymentModal(bill, onChanged);
          });
        }
      },
    });
  }

  function openPaymentModal(bill, onChanged) {
    var bal = Math.max(0, bill.balance || 0);
    UI.modal({
      title: "Record payment",
      subtitle: bill.no + " · Balance " + U.money(bal),
      size: "slim",
      body: '<div class="field"><label>Amount received</label>' +
        '<input class="input" id="rp-amount" type="number" min="0" max="' + bal + '" step="0.01" value="' + bal + '" inputmode="decimal" data-autofocus></div>' +
        '<div class="row" style="gap:6px;margin-top:10px">' +
        '<button class="btn btn-sm" id="rp-full">Full balance</button>' +
        '<button class="btn btn-sm" id="rp-half">Half</button>' +
        "</div>" +
        '<div class="auth-error" id="rp-error"></div>',
      footer: '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn-primary" id="rp-save">' + UI.icon("check", 16) + " Save payment</button>",
      onMount: function (overlay) {
        var input = overlay.querySelector("#rp-amount");
        overlay.querySelector("#rp-full").addEventListener("click", function () { input.value = bal.toFixed(2); });
        overlay.querySelector("#rp-half").addEventListener("click", function () { input.value = (bal / 2).toFixed(2); });
        overlay.querySelector("#rp-save").addEventListener("click", function () {
          var v = Number(input.value);
          if (!(v > 0)) {
            var err = overlay.querySelector("#rp-error");
            err.innerHTML = UI.icon("alertCircle", 15) + " Enter an amount greater than zero.";
            err.classList.add("show");
            return;
          }
          S.payBill(bill.id, v);
          UI.closeModal();
          UI.toast("Payment recorded for " + bill.no + ".", "ok");
          if (onChanged) onChanged();
          global.POS.app.refresh();
        });
      },
    });
  }

  views.transactions = {
    title: "Transactions",
    subtitle: "Every completed bill, ready to reprint",

    render: function () {
      var bills = txFiltered();
      var total = bills.reduce(function (s, b) { return s + (b.total || 0); }, 0);
      var selectedCount = Object.keys(txSelected).filter(function (k) { return txSelected[k]; }).length;

      return '<div class="stack"><div class="card">' +
        head("Completed bills", "Search, reprint or remove a transaction",
          '<span class="badge outline">' + U.num(bills.length) + " bills · " + U.money(total) + "</span>") +
        '<div class="card-body">' +
        '<div class="row-between" style="margin-bottom:14px">' +
        '<div class="search-row" style="flex:1">' +
        '<div class="input-icon">' + UI.icon("search", 17) +
        '<input class="input" id="tx-search" type="search" placeholder="Bill number, customer, bank or date" value="' + U.esc(txSearch) + '">' +
        "</div>" +
        '<button class="btn-icon" id="tx-refresh" title="Refresh">' + UI.icon("refresh", 17) + "</button>" +
        "</div>" +
        '<div class="row">' +
        '<button class="btn" id="tx-view"' + (selectedCount === 1 ? "" : " disabled") + ">" + UI.icon("eye", 16) + " View / Print</button>" +
        '<button class="btn btn-outline" id="tx-download"' + (selectedCount ? "" : " disabled") + ">" + UI.icon("download", 16) + " Download bill" + (selectedCount > 1 ? "s (" + selectedCount + ")" : "") + "</button>" +
        '<button class="btn btn-danger" id="tx-delete"' + (selectedCount ? "" : " disabled") + ">Delete selected</button>" +
        '<button class="btn btn-danger" id="tx-delete-all"' + (S.db.bills.length ? "" : " disabled") + ">Delete all</button>" +
        "</div>" +
        "</div>" +
        '<div class="table-wrap table-scroll"><table class="data"><thead><tr>' +
        '<th style="width:36px"><input type="checkbox" id="tx-all" aria-label="Select all"></th>' +
        "<th>Bill No</th><th>Date &amp; Time</th><th>Customer</th><th>Payment</th><th class='num'>Items</th>" +
        "<th class='num'>Total</th><th class='num'>Paid</th><th class='num'>Remaining</th>" +
        "</tr></thead><tbody id='tx-rows'>" + txRowsHTML() + "</tbody></table></div>" +
        "</div></div></div>";
    },

    mount: function (root) {
      var search = root.querySelector("#tx-search");

      function repaint() {
        var rows = root.querySelector("#tx-rows");
        if (rows) rows.innerHTML = txRowsHTML();
        var count = Object.keys(txSelected).filter(function (k) { return txSelected[k]; }).length;
        var view = root.querySelector("#tx-view");
        var dl = root.querySelector("#tx-download");
        var del = root.querySelector("#tx-delete");
        if (view) view.disabled = count !== 1;
        if (dl) {
          dl.disabled = !count;
          dl.innerHTML = UI.icon("download", 16) + " Download bill" + (count > 1 ? "s (" + count + ")" : "");
        }
        if (del) del.disabled = !count;
        var all = root.querySelector("#tx-all");
        if (all) {
          var bills = txFiltered();
          all.checked = bills.length > 0 && bills.every(function (b) { return txSelected[b.id]; });
        }
      }

      if (search) {
        search.addEventListener("input", function () {
          txSearch = search.value;
          repaint();
        });
      }

      root.querySelector("#tx-refresh").addEventListener("click", function () {
        global.POS.app.refresh();
        UI.toast("Transactions refreshed.");
      });

      root.addEventListener("change", function (e) {
        if (e.target.classList.contains("tx-check")) {
          txSelected[e.target.getAttribute("data-id")] = e.target.checked;
          e.target.closest("tr").classList.toggle("selected", e.target.checked);
          repaint();
        }
        if (e.target.id === "tx-all") {
          var on = e.target.checked;
          txFiltered().forEach(function (b) { txSelected[b.id] = on; });
          repaint();
        }
      });

      root.querySelector("#tx-view").addEventListener("click", function () {
        var id = Object.keys(txSelected).filter(function (k) { return txSelected[k]; })[0];
        var bill = S.bill(id);
        if (bill) openBillModal(bill);
      });

      root.querySelector("#tx-download").addEventListener("click", function () {
        var ids = Object.keys(txSelected).filter(function (k) { return txSelected[k]; });
        var bills = ids.map(function (id) { return S.bill(id); }).filter(Boolean);
        if (!bills.length) return;
        bills.forEach(function (b, i) {
          var display = Object.assign({}, b);
          var cust = b.customerId ? S.customer(b.customerId) : null;
          if (cust) {
            display.customerAddress = cust.address || "";
            display.customerNote = cust.note || "";
          }
          var delay = ids.length > 1 ? i * 700 : 0;
          setTimeout(function () { UI.downloadReceipt(display); }, delay);
        });
        UI.toast(bills.length + " bill file(s) saved.", "ok");
      });

      root.querySelector("#tx-delete").addEventListener("click", function () {
        var ids = Object.keys(txSelected).filter(function (k) { return txSelected[k]; });
        if (!ids.length) return;
        UI.confirm({
          title: "Delete " + ids.length + " transaction" + (ids.length > 1 ? "s" : "") + "?",
          message: "Stock will be returned to inventory. This cannot be undone.",
          confirmText: "Delete",
          danger: true,
        }).then(function (ok) {
          if (!ok) return;
          S.deleteBills(ids);
          txSelected = {};
          UI.toast(ids.length + " transaction(s) deleted.", "ok");
          global.POS.app.refresh();
        });
      });

      root.querySelector("#tx-delete-all").addEventListener("click", function () {
        var all = S.db.bills.slice();
        if (!all.length) return;
        UI.confirm({
          title: "Delete all transactions?",
          message: "This removes all " + all.length + " bills and returns their stock. Sales reports will be cleared. This cannot be undone.",
          confirmText: "Delete everything",
          danger: true,
        }).then(function (ok) {
          if (!ok) return;
          S.deleteBills(all.map(function (b) { return b.id; }));
          txSelected = {};
          UI.toast("All transactions deleted.", "ok");
          global.POS.app.refresh();
        });
      });
    },
  };

  /* ============================================================
     Inventory
     ============================================================ */

  var invSearch = "";
  var invLowOnly = false;
  var invSelectedId = null;

  function invFiltered() {
    var q = invSearch.trim().toLowerCase();
    return S.items().filter(function (i) {
      if (invLowOnly && Number(i.qty) > Number(i.reorder)) return false;
      if (!q) return true;
      return (i.name + " " + i.category + " " + i.id).toLowerCase().indexOf(q) !== -1;
    });
  }

  function invRowsHTML() {
    var items = invFiltered();
    if (!items.length) {
      return '<tr><td colspan="8">' + emptyState("box", "No items found",
        invSearch ? "Try another search term." : "Add your first stock item below.") + "</td></tr>";
    }
    return items.map(function (i) {
      var qty = Number(i.qty) || 0;
      var status = qty <= 0
        ? '<span class="badge danger">Out</span>'
        : qty <= Number(i.reorder)
          ? '<span class="badge warn">Low</span>'
          : '<span class="badge ok">OK</span>';
      return '<tr class="row-click ' + (invSelectedId === i.id ? "selected" : "") + '" data-item-row="' + i.id + '">' +
        '<td class="strong">' + U.esc(i.name) + "</td>" +
        "<td>" + U.esc(i.category) + "</td>" +
        '<td class="mono">' + U.esc(i.unit) + "</td>" +
        '<td class="num mono">' + U.money(i.cost) + "</td>" +
        '<td class="num mono strong">' + U.money(i.price) + "</td>" +
        '<td class="num mono">' + U.num(qty) + "</td>" +
        '<td class="num mono">' + U.num(i.reorder) + "</td>" +
        "<td>" + status + "</td>" +
        "</tr>";
    }).join("");
  }

  function invFormHTML() {
    var it = invSelectedId ? S.item(invSelectedId) : null;
    var units = ["pcs", "pack", "kg", "g", "ltr", "ml", "box", "dozen"];

    return '<div class="form-grid">' +
      '<div class="field span-2"><label>Name *</label><input class="input" id="inv-name" value="' + U.esc(it ? it.name : "") + '" placeholder="Item name"></div>' +
      '<div class="field"><label>Category</label><input class="input" id="inv-cat" value="' + U.esc(it ? it.category : "") + '" placeholder="Type to search or add a new category" autocomplete="off"></div>' +
      '<div class="field"><label>Sold by</label><select class="select" id="inv-unit">' +
      units.map(function (u) { return '<option value="' + u + '"' + (it && it.unit === u ? " selected" : "") + ">" + u + "</option>"; }).join("") +
      "</select></div>" +
      '<div class="field"><label>Cost price</label><input class="input" id="inv-cost" type="number" min="0" step="0.01" value="' + (it ? it.cost : "") + '" inputmode="decimal"></div>' +
      '<div class="field"><label>Selling price</label><input class="input" id="inv-price" type="number" min="0" step="0.01" value="' + (it ? it.price : "") + '" inputmode="decimal"></div>' +
      '<div class="field"><label>Stock qty</label><input class="input" id="inv-qty" type="number" min="0" step="0.01" value="' + (it ? it.qty : "") + '" inputmode="decimal"></div>' +
      '<div class="field"><label>Reorder level</label><input class="input" id="inv-reorder" type="number" min="0" step="1" value="' + (it ? it.reorder : 5) + '" inputmode="numeric"></div>' +
      "</div>" +
      '<div class="form-actions">' +
      '<button class="btn btn-primary" id="inv-save">' + UI.icon("check", 16) + " " + (it ? "Save changes" : "Add item") + "</button>" +
      '<button class="btn" id="inv-clear">' + (it ? "Clear form" : "Reset") + "</button>" +
      (it ? '<button class="btn btn-danger" id="inv-delete" style="margin-left:auto">' + UI.icon("trash", 16) + " Delete item</button>" : "") +
      "</div>" +
      (it ? '<p class="small muted" style="margin-top:10px">Editing <strong style="color:var(--text-2)">' + U.esc(it.name) + "</strong>. Deleting hides the item but keeps past bills intact.</p>" : "");
  }

  function readInvForm(root) {
    return {
      name: root.querySelector("#inv-name").value,
      category: root.querySelector("#inv-cat").value,
      unit: root.querySelector("#inv-unit").value,
      cost: root.querySelector("#inv-cost").value,
      price: root.querySelector("#inv-price").value,
      qty: root.querySelector("#inv-qty").value,
      reorder: root.querySelector("#inv-reorder").value,
    };
  }

  function refreshInvRows() {
    var rows = document.getElementById("inv-rows");
    if (rows) rows.innerHTML = invRowsHTML();
  }

  function refreshInv() {
    var rows = document.getElementById("inv-rows");
    if (rows) rows.innerHTML = invRowsHTML();
    var form = document.getElementById("inv-form");
    if (form) form.innerHTML = invFormHTML();
    bindInvForm();
  }

  function bindInvForm() {
    var root = document.getElementById("inv-form");
    if (!root) return;
    var save = root.querySelector("#inv-save");
    var clear = root.querySelector("#inv-clear");
    var del = root.querySelector("#inv-delete");

    categoryCombo(root.querySelector("#inv-cat"));

    if (save) {
      save.addEventListener("click", function () {
        var data = readInvForm(root);
        var res = invSelectedId ? S.updateItem(invSelectedId, data) : S.addItem(data);
        if (res.error) { UI.toast(res.error, "err"); return; }
        if (!invSelectedId) invSelectedId = res.item.id;
        UI.toast(invSelectedId ? "Item saved." : "Item added.", "ok");
        refreshInv();
        var table = document.getElementById("inv-rows");
        if (table) {
          // keep the selected row visible
          var row = table.querySelector('[data-item-row="' + invSelectedId + '"]');
          if (row) row.classList.add("selected");
        }
        global.POS.app.refresh();
      });
    }

    if (clear) {
      clear.addEventListener("click", function () {
        invSelectedId = null;
        refreshInv();
      });
    }

    if (del) {
      del.addEventListener("click", function () {
        var it = S.item(invSelectedId);
        if (!it) return;
        UI.confirm({
          title: "Delete " + it.name + "?",
          message: "The item will be hidden from billing. Past bills and reports stay untouched.",
          confirmText: "Delete item",
          danger: true,
        }).then(function (ok) {
          if (!ok) return;
          S.deleteItem(it.id);
          invSelectedId = null;
          UI.toast("Item deleted.", "ok");
          global.POS.app.refresh();
        });
      });
    }
  }

  views.inventory = {
    title: "Inventory & Stock",
    subtitle: "Quantities, prices and low-stock alerts",

    render: function () {
      var all = S.items();
      var low = S.lowStock();
      var stockValue = all.reduce(function (s, i) { return s + i.cost * i.qty; }, 0);
      var retailValue = all.reduce(function (s, i) { return s + i.price * i.qty; }, 0);

      return '<div class="stack">' +

        '<div class="grid grid-kpi">' +
        '<div class="kpi"><div class="kpi-label">Stock items</div><div class="kpi-value">' + U.num(all.length, 0) + '</div><div class="kpi-foot">' + U.num(low.length, 0) + " at or below reorder level</div></div>" +
        '<div class="kpi"><div class="kpi-label">Stock value (cost)</div><div class="kpi-value"><span class="unit">' + U.esc(S.db.shop.currency) + "</span>" + amount(stockValue) + '</div><div class="kpi-foot">Money currently on the shelf</div></div>' +
        '<div class="kpi"><div class="kpi-label">Retail value</div><div class="kpi-value"><span class="unit">' + U.esc(S.db.shop.currency) + "</span>" + amount(retailValue) + '</div><div class="kpi-foot">If everything sells at list price</div></div>' +
        '<div class="kpi"><div class="kpi-label">Low stock</div><div class="kpi-value">' + U.num(low.length, 0) + ' <span class="unit">items</span></div><div class="kpi-foot">' + (low.length ? '<span class="neg">Reorder these soon</span>' : '<span class="pos">Everything looks healthy</span>') + "</div></div>" +
        "</div>" +

        '<div class="card">' +
        head("Stock list", "Live quantities, updated automatically",
          '<span class="badge outline">Updated ' + U.timeShort(Date.now()) + "</span>") +
        '<div class="card-body">' +
        '<div class="row-between" style="margin-bottom:12px">' +
        '<div class="search-row" style="flex:1">' +
        '<div class="input-icon">' + UI.icon("search", 17) +
        '<input class="input" id="inv-search" type="search" placeholder="Search stock" value="' + U.esc(invSearch) + '">' +
        "</div>" +
        '<label class="check"><input type="checkbox" id="inv-low"' + (invLowOnly ? " checked" : "") + "> Low stock only</label>" +
        "</div>" +
        '<div class="row">' +
        '<button class="btn btn-sm" id="inv-export">' + UI.icon("download", 15) + " Export CSV</button>" +
        '<button class="btn-icon" id="inv-refresh" title="Refresh">' + UI.icon("refresh", 17) + "</button>" +
        "</div>" +
        "</div>" +
        '<div class="table-wrap table-scroll"><table class="data"><thead><tr>' +
        "<th>Name</th><th>Category</th><th>Unit</th><th class='num'>Cost</th><th class='num'>Price</th><th class='num'>Qty</th><th class='num'>Reorder</th><th>Status</th>" +
        "</tr></thead><tbody id='inv-rows'>" + invRowsHTML() + "</tbody></table></div>" +
        "</div></div>" +

        '<div class="card">' +
        head("Item details", "Add a new item or tap a row to edit it",
          '<button class="btn btn-sm" id="inv-new">' + UI.icon("plus", 15) + " New item</button>") +
        '<div class="card-body"><div id="inv-form">' + invFormHTML() + "</div></div>" +
        "</div>" +

        "</div>";
    },

    mount: function (root) {
      var search = root.querySelector("#inv-search");
      var low = root.querySelector("#inv-low");

      if (search) {
        search.addEventListener("input", function () {
          invSearch = search.value;
          refreshInvRows();
        });
      }

      if (low) {
        low.addEventListener("change", function () {
          invLowOnly = low.checked;
          refreshInvRows();
        });
      }

      root.querySelector("#inv-refresh").addEventListener("click", function () {
        global.POS.app.refresh();
        UI.toast("Stock refreshed.");
      });

      root.querySelector("#inv-new").addEventListener("click", function () {
        invSelectedId = null;
        refreshInv();
        var name = document.getElementById("inv-name");
        if (name) { name.focus(); name.scrollIntoView({ behavior: "smooth", block: "center" }); }
      });

      root.querySelector("#inv-export").addEventListener("click", function () {
        var rows = [["Name", "Category", "Unit", "Cost", "Price", "Qty", "Reorder"]];
        S.items().forEach(function (i) {
          rows.push([i.name, i.category, i.unit, i.cost, i.price, i.qty, i.reorder]);
        });
        var csv = rows.map(function (r) {
          return r.map(function (c) {
            var s = String(c == null ? "" : c);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          }).join(",");
        }).join("\n");
        UI.download("wishfresh-stock-" + U.dateKey(Date.now()) + ".csv", csv, "text/csv");
        UI.toast("Stock exported as CSV.", "ok");
      });

      root.addEventListener("click", function (e) {
        var row = e.target.closest("[data-item-row]");
        if (row) {
          invSelectedId = row.getAttribute("data-item-row");
          refreshInv();
          var form = document.getElementById("inv-form");
          if (form && window.innerWidth < 900) form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      bindInvForm();
    },
  };

  /* ============================================================
     Customers
     ============================================================ */

  var cusSearch = "";
  var cusSelectedId = null;

  function cusFiltered() {
    var q = cusSearch.trim().toLowerCase();
    return S.customers().filter(function (c) {
      if (!q) return true;
      return (c.name + " " + c.phone + " " + c.address).toLowerCase().indexOf(q) !== -1;
    });
  }

  function cusRowsHTML() {
    var list = cusFiltered();
    if (!list.length) {
      return '<tr><td colspan="6">' + emptyState("users", "No customers found",
        cusSearch ? "Try another name or phone number." : "Add your first customer below.") + "</td></tr>";
    }
    return list.map(function (c) {
      var bal = S.customerBalance(c.id);
      var bills = S.customerBills(c.id).length;
      var noteShort = (c.note || "").replace(/\s+/g, " ").trim().slice(0, 80);
      if ((c.note || "").length > 80) noteShort += "…";
      return '<tr class="row-click ' + (cusSelectedId === c.id ? "selected" : "") + '" data-cus-row="' + c.id + '">' +
        '<td class="strong">' + U.esc(c.name) + (c.note ? ' <span class="badge outline" title="' + U.esc(c.note) + '">note</span>' : "") + "</td>" +
        '<td class="mono">' + (c.phone ? U.esc(c.phone) : '<span class="muted">—</span>') + "</td>" +
        "<td>" + (c.address ? U.esc(c.address) : '<span class="muted">—</span>') + (noteShort ? '<div class="small muted" style="margin-top:2px">Note: ' + U.esc(noteShort) + "</div>" : "") + "</td>" +
        '<td class="num">' + U.num(bills, 0) + "</td>" +
        '<td class="num ' + (bal > 0 ? "neg" : "") + '">' + U.money(bal) + "</td>" +
        '<td class="num"><button class="btn btn-sm btn-ghost" data-cus-history="' + c.id + '">History</button></td>' +
        "</tr>";
    }).join("");
  }

  function cusFormHTML() {
    var c = cusSelectedId ? S.customer(cusSelectedId) : null;
    var bal = c ? S.customerBalance(c.id) : 0;
    return '<div class="form-grid">' +
      '<div class="field"><label>Name *</label><input class="input" id="cus-name" value="' + U.esc(c ? c.name : "") + '" placeholder="Customer name"></div>' +
      '<div class="field"><label>Phone</label><input class="input" id="cus-phone" value="' + U.esc(c ? c.phone : "") + '" placeholder="07X XXX XXXX" inputmode="tel"></div>' +
      '<div class="field span-2"><label>Address</label><input class="input" id="cus-address" value="' + U.esc(c ? c.address : "") + '" placeholder="City / area"></div>' +
      '<div class="field span-2"><label>Note</label><textarea class="input" id="cus-note" rows="3" placeholder="e.g. Prefers delivery on Fridays. Credit limit Rs. 10,000.">' + U.esc(c ? (c.note || "") : "") + "</textarea></div>" +
      "</div>" +
      '<div class="form-actions">' +
      '<button class="btn btn-primary" id="cus-save">' + UI.icon("check", 16) + " " + (c ? "Save changes" : "Add customer") + "</button>" +
      '<button class="btn" id="cus-clear">' + (c ? "Clear form" : "Reset") + "</button>" +
      (c ? '<button class="btn btn-danger" id="cus-delete" style="margin-left:auto">' + UI.icon("trash", 16) + " Delete customer</button>" : "") +
      "</div>" +
      (c ? '<p class="small muted" style="margin-top:10px">Bills stay in sales history after a customer is deleted. Balance due: <strong style="color:var(--text-2)">' + U.money(bal) + "</strong></p>" : "");
  }

  function refreshCusRows() {
    var rows = document.getElementById("cus-rows");
    if (rows) rows.innerHTML = cusRowsHTML();
  }

  function refreshCus() {
    var rows = document.getElementById("cus-rows");
    if (rows) rows.innerHTML = cusRowsHTML();
    var form = document.getElementById("cus-form");
    if (form) form.innerHTML = cusFormHTML();
    bindCusForm();
  }

  function bindCusForm() {
    var root = document.getElementById("cus-form");
    if (!root) return;

    var save = root.querySelector("#cus-save");
    var clear = root.querySelector("#cus-clear");
    var del = root.querySelector("#cus-delete");

    if (save) {
      save.addEventListener("click", function () {
        var data = {
          name: root.querySelector("#cus-name").value,
          phone: root.querySelector("#cus-phone").value,
          address: root.querySelector("#cus-address").value,
          note: root.querySelector("#cus-note").value,
        };
        var res = cusSelectedId ? S.updateCustomer(cusSelectedId, data) : S.addCustomer(data);
        if (res.error) { UI.toast(res.error, "err"); return; }
        if (!cusSelectedId) cusSelectedId = res.customer.id;
        UI.toast("Customer saved.", "ok");
        global.POS.app.refresh();
      });
    }

    if (clear) {
      clear.addEventListener("click", function () {
        cusSelectedId = null;
        refreshCus();
      });
    }

    if (del) {
      del.addEventListener("click", function () {
        var c = S.customer(cusSelectedId);
        if (!c) return;
        UI.confirm({
          title: "Delete " + c.name + "?",
          message: "Their bills stay in sales history, but the contact and credit balance link will be removed.",
          confirmText: "Delete customer",
          danger: true,
        }).then(function (ok) {
          if (!ok) return;
          S.deleteCustomer(c.id);
          cusSelectedId = null;
          UI.toast("Customer deleted.", "ok");
          global.POS.app.refresh();
        });
      });
    }
  }

  function openCustomerHistory(customer) {
    var bills = S.customerBills(customer.id);
    var bal = S.customerBalance(customer.id);
    var total = bills.reduce(function (s, b) { return s + b.total; }, 0);

    var rows = bills.length ? bills.map(function (b) {
      return "<tr>" +
        '<td class="mono strong">' + U.esc(b.no) + "</td>" +
        '<td class="mono">' + U.dateShort(b.ts) + "</td>" +
        '<td class="num">' + U.money(b.total) + "</td>" +
        '<td class="num">' + U.money(b.paid) + "</td>" +
        '<td class="num ' + (b.balance > 0 ? "neg" : "") + '">' + U.money(b.balance) + "</td>" +
        "</tr>";
    }).join("") : '<tr><td colspan="5">' + emptyState("receipt", "No bills yet", "This customer has not shopped yet.") + "</td></tr>";

    UI.modal({
      title: customer.name,
      subtitle: (customer.phone || "No phone") + (customer.address ? " · " + customer.address : ""),
      size: "wide",
      body:
        (customer.note ? '<div class="note-box" style="background:var(--surface-2);border-left:3px solid var(--accent);border-radius:8px;padding:10px 12px;margin-bottom:12px"><div class="small muted" style="text-transform:uppercase;letter-spacing:.06em;font-size:10px">Customer note</div>' + U.esc(customer.note).replace(/\n/g, "<br>") + "</div>" : "") +
        '<div class="report-summary">' +
        '<div class="report-stat"><div class="rs-label">Bills</div><div class="rs-value">' + U.num(bills.length, 0) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Total spent</div><div class="rs-value">' + U.money(total) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Balance due</div><div class="rs-value ' + (bal > 0 ? "neg" : "") + '">' + U.money(bal) + "</div></div>" +
        "</div>" +
        '<div class="table-wrap"><table class="data compact"><thead><tr>' +
        "<th>Bill</th><th>Date</th><th class='num'>Total</th><th class='num'>Paid</th><th class='num'>Balance</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>",
      footer: '<button class="btn" data-close>Close</button>' +
        (bal > 0 ? '<button class="btn btn-primary" id="ch-pay">' + UI.icon("wallet", 16) + " Settle balance</button>" : ""),
      onMount: function (overlay) {
        var pay = overlay.querySelector("#ch-pay");
        if (pay) {
          pay.addEventListener("click", function () {
            var latest = bills.filter(function (b) { return b.balance > 0; })[0];
            if (!latest) return;
            UI.closeModal();
            openPaymentModal(latest, function () {});
          });
        }
      },
    });
  }

  views.customers = {
    title: "Customers",
    subtitle: "Contacts, credit balances and history",

    render: function () {
      var all = S.customers();
      var totalDue = all.reduce(function (s, c) { return s + S.customerBalance(c.id); }, 0);
      var withCredit = all.filter(function (c) { return S.customerBalance(c.id) > 0; }).length;

      return '<div class="stack">' +

        '<div class="grid grid-kpi">' +
        '<div class="kpi"><div class="kpi-label">Customers</div><div class="kpi-value">' + U.num(all.length, 0) + '</div><div class="kpi-foot">Saved contacts in your shop database</div></div>' +
        '<div class="kpi"><div class="kpi-label">Total balance due</div><div class="kpi-value"><span class="unit">' + U.esc(S.db.shop.currency) + "</span>" + amount(totalDue) + '</div><div class="kpi-foot">Outstanding credit across all customers</div></div>' +
        '<div class="kpi"><div class="kpi-label">With credit</div><div class="kpi-value">' + U.num(withCredit, 0) + ' <span class="unit">people</span></div><div class="kpi-foot">' + (withCredit ? "Follow up on pending balances" : "All balances are clear") + "</div></div>" +
        '<div class="kpi"><div class="kpi-label">Repeat buyers</div><div class="kpi-value">' + U.num(all.filter(function (c) { return S.customerBills(c.id).length > 1; }).length, 0) + ' <span class="unit">people</span></div><div class="kpi-foot">Customers with more than one bill</div></div>' +
        "</div>" +

        '<div class="card">' +
        head("Customer directory", "Search by name or phone number",
          '<span class="badge ok">' + U.num(all.length) + " customer(s)</span>") +
        '<div class="card-body">' +
        '<div class="search-row" style="margin-bottom:12px">' +
        '<div class="input-icon">' + UI.icon("search", 17) +
        '<input class="input" id="cus-search" type="search" placeholder="Search by name or phone" value="' + U.esc(cusSearch) + '">' +
        "</div>" +
        '<button class="btn" id="cus-show-all">Show all</button>' +
        '<span class="small muted" style="margin-left:auto">Total balance due: <strong style="color:var(--text-2)">' + U.money(totalDue) + "</strong></span>" +
        "</div>" +
        '<div class="table-wrap table-scroll"><table class="data"><thead><tr>' +
        "<th>Name</th><th>Phone</th><th>Address</th><th class='num'>Bills</th><th class='num'>Balance due</th><th></th>" +
        "</tr></thead><tbody id='cus-rows'>" + cusRowsHTML() + "</tbody></table></div>" +
        "</div></div>" +

        '<div class="card">' +
        head("Customer details", "Add a customer or tap a row to edit") +
        '<div class="card-body"><div id="cus-form">' + cusFormHTML() + "</div></div>" +
        "</div>" +

        "</div>";
    },

    mount: function (root) {
      var search = root.querySelector("#cus-search");
      if (search) {
        search.addEventListener("input", function () {
          cusSearch = search.value;
          refreshCusRows();
        });
      }

      root.querySelector("#cus-show-all").addEventListener("click", function () {
        cusSearch = "";
        if (search) search.value = "";
        refreshCusRows();
      });

      root.addEventListener("click", function (e) {
        var hist = e.target.closest("[data-cus-history]");
        if (hist) {
          e.stopPropagation();
          var c = S.customer(hist.getAttribute("data-cus-history"));
          if (c) openCustomerHistory(c);
          return;
        }
        var row = e.target.closest("[data-cus-row]");
        if (row) {
          cusSelectedId = row.getAttribute("data-cus-row");
          refreshCus();
          var form = document.getElementById("cus-form");
          if (form && window.innerWidth < 900) form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      bindCusForm();
    },
  };

  /* ============================================================
     Reports
     ============================================================ */

  var repType = "daily";
  var repAnchor = U.startOfDay(Date.now());

  function parseDateInput(value) {
    var p = String(value || "").split("-");
    if (p.length !== 3) return U.startOfDay(Date.now());
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function shiftAnchor(dir) {
    var d = new Date(repAnchor);
    if (repType === "week") d.setDate(d.getDate() + dir * 7);
    else if (repType === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir);
    repAnchor = d.getTime();
  }

  function reportData() {
    var range = S.rangeFor(repType, repAnchor);
    var bills = S.billsBetween(range.from, range.to).sort(function (a, b) { return a.ts - b.ts; });
    return { range: range, bills: bills, sum: S.summarize(bills) };
  }

  function reportRowsHTML(data) {
    if (repType === "daily") {
      if (!data.bills.length) {
        return '<tr><td colspan="7">' + emptyState("receipt", "No sales on this day", "Pick another date or complete a new bill.") + "</td></tr>";
      }
      return data.bills.map(function (b) {
        return "<tr>" +
          '<td class="mono strong">' + U.esc(b.no) + "</td>" +
          '<td class="mono">' + U.timeShort(b.ts) + "</td>" +
          "<td>" + U.esc(b.customerName) + "</td>" +
          '<td class="num strong">' + U.money(b.total) + "</td>" +
          '<td class="num">' + U.money(b.profit) + "</td>" +
          '<td class="num">' + U.money(b.paid) + "</td>" +
          '<td class="num ' + (b.balance > 0 ? "neg" : "") + '">' + U.money(b.balance) + "</td>" +
          "</tr>";
      }).join("");
    }

    var d = U.startOfDay(data.range.from);
    var rows = [];
    while (d < data.range.to) {
      var bs = S.billsBetween(d, U.addDays(d, 1));
      if (bs.length) {
        var s = S.summarize(bs);
        rows.push("<tr>" +
          '<td class="strong">' + U.dayFull(d) + "</td>" +
          '<td class="num">' + U.num(s.count, 0) + "</td>" +
          '<td class="num strong">' + U.money(s.total) + "</td>" +
          '<td class="num">' + U.money(s.profit) + "</td>" +
          '<td class="num">' + U.money(s.paid) + "</td>" +
          '<td class="num ' + (s.balance > 0 ? "neg" : "") + '">' + U.money(s.balance) + "</td>" +
          "</tr>");
      }
      d = U.addDays(d, 1);
    }

    if (!rows.length) {
      return '<tr><td colspan="6">' + emptyState("chart", "No sales in this period", "Pick another period or complete a new bill.") + "</td></tr>";
    }
    return rows.join("");
  }

  function reportTableHTML(data) {
    if (repType === "daily") {
      return '<div class="table-wrap"><table class="data"><thead><tr>' +
        "<th>Bill No</th><th>Time</th><th>Customer</th><th class='num'>Total</th><th class='num'>Net profit</th><th class='num'>Received</th><th class='num'>Remaining</th>" +
        "</tr></thead><tbody>" + reportRowsHTML(data) + "</tbody></table></div>";
    }
    return '<div class="table-wrap"><table class="data"><thead><tr>' +
      "<th>Date</th><th class='num'>Bills</th><th class='num'>Total sales</th><th class='num'>Net profit</th><th class='num'>Received</th><th class='num'>Remaining</th>" +
      "</tr></thead><tbody>" + reportRowsHTML(data) + "</tbody></table></div>";
  }

  function printReport(data) {
    var shop = S.db.shop;
    var title = (repType.charAt(0).toUpperCase() + repType.slice(1)) + " sales report";
    var rows = "";
    if (repType === "daily") {
      rows = data.bills.map(function (b) {
        return "<tr><td>" + U.esc(b.no) + "</td><td>" + U.dateTime(b.ts) + "</td><td>" + U.esc(b.customerName) +
          '</td><td class="n">' + U.money(b.total) + '</td><td class="n">' + U.money(b.profit) + '</td><td class="n">' +
          U.money(b.paid) + '</td><td class="n">' + U.money(b.balance) + "</td></tr>";
      }).join("");
    } else {
      var d = U.startOfDay(data.range.from);
      while (d < data.range.to) {
        var bs = S.billsBetween(d, U.addDays(d, 1));
        if (bs.length) {
          var s = S.summarize(bs);
          rows += "<tr><td>" + U.dayFull(d) + '</td><td class="n">' + s.count + '</td><td class="n">' + U.money(s.total) +
            '</td><td class="n">' + U.money(s.profit) + '</td><td class="n">' + U.money(s.paid) +
            '</td><td class="n">' + U.money(s.balance) + "</td></tr>";
        }
        d = U.addDays(d, 1);
      }
    }

    var headCols = repType === "daily"
      ? "<th>Bill</th><th>Date &amp; time</th><th>Customer</th><th class='n'>Total</th><th class='n'>Profit</th><th class='n'>Received</th><th class='n'>Remaining</th>"
      : "<th>Date</th><th class='n'>Bills</th><th class='n'>Total</th><th class='n'>Profit</th><th class='n'>Received</th><th class='n'>Remaining</th>";

    var shopName = (shop.legalName || shop.name).toUpperCase();
    var contact = [shop.address, shop.phone, shop.email].filter(Boolean).join(" · ");
    var sum = data.sum;
    var dot = (shop.reportPaper || "9.5x11") !== "a4";

    var table = "<table><thead><tr>" + headCols + "</tr></thead><tbody>" +
      (rows || '<tr><td colspan="7" class="empty">No sales in this period</td></tr>') +
      "</tbody><tfoot><tr><td>TOTAL</td>" +
      (repType === "daily" ? '<td colspan="2"></td>' : '<td class="n">' + sum.count + "</td>") +
      '<td class="n">' + U.money(sum.total) + '</td><td class="n">' + U.money(sum.profit) +
      '</td><td class="n">' + U.money(sum.paid) + '</td><td class="n">' + U.money(sum.balance) + "</td></tr></tfoot></table>";

    var html;
    if (dot) {
      html = "<!doctype html><html><head><meta charset='utf-8'><title>" + U.esc(title) + "</title><style>" +
        "@page{size:241mm 279mm;margin:8mm}" +
        "*{box-sizing:border-box}html,body{margin:0;padding:0}" +
        "body{font-family:'Courier New',Courier,monospace;font-size:9pt;line-height:1.3;color:#000}" +
        ".c{text-align:center}.name{font-size:13pt;font-weight:bold}" +
        ".small{font-size:8pt}.rule{border-top:1px dashed #000;margin:5px 0}" +
        ".head{border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px}" +
        ".meta{display:flex;justify-content:space-between;gap:10px;margin-bottom:6px}" +
        "table{width:100%;border-collapse:collapse}" +
        "th{text-align:left;border-bottom:1px solid #000;padding:3px 2px;font-size:8pt;font-weight:bold}" +
        "td{padding:2px;border-bottom:1px dotted #000;vertical-align:top}" +
        ".n{text-align:right;white-space:nowrap}" +
        ".sum td{padding:2px 4px;border:1px solid #000}" +
        ".sum .r{text-align:right;white-space:nowrap}" +
        "tfoot td{font-weight:bold;border-top:2px solid #000;border-bottom:none;padding-top:4px}" +
        ".empty{text-align:center;padding:12px}" +
        ".foot{margin-top:12px;font-size:8pt;display:flex;justify-content:space-between}" +
        "</style></head><body>" +
        '<div class="head"><div class="c name">' + U.esc(shopName) + "</div>" +
        '<div class="c small">' + U.esc(contact) + "</div></div>" +
        '<div class="meta"><div><strong>' + U.esc(title) + '</strong><div class="small">' + U.esc(data.range.label) + "</div></div>" +
        '<div class="small" style="text-align:right">Printed ' + U.dateTime(Date.now()) + "</div></div>" +
        '<div class="rule"></div>' +
        '<table class="sum"><tbody>' +
        '<tr><td>Bills</td><td class="r">' + U.num(sum.count, 0) + '</td><td>Total sales</td><td class="r">' + U.money(sum.total) + "</td></tr>" +
        '<tr><td>Received</td><td class="r">' + U.money(sum.paid) + '</td><td>Remaining</td><td class="r">' + U.money(sum.balance) + "</td></tr>" +
        '<tr><td>Net profit</td><td class="r">' + U.money(sum.profit) + '</td><td>Average bill</td><td class="r">' + U.money(sum.avg) + "</td></tr>" +
        "</tbody></table>" +
        '<div class="rule"></div>' + table +
        '<div class="foot"><span>' + U.esc(shopName) + " · Austerra POS</span><span>Signature: ______________________</span></div>" +
        "</body></html>";
    } else {
      var logo = location.href.split("#")[0].replace(/[^/]*$/, "") + "assets/img/austerra-logo.jpeg";
      html = "<!doctype html><html><head><meta charset='utf-8'><title>" + U.esc(title) + "</title><style>" +
        "@page{size:A4;margin:16mm}body{font-family:'Segoe UI',Arial,sans-serif;color:#111;font-size:11px}" +
        "h1{font-size:20px;margin:0 0 2px}.muted{color:#666;font-size:10px}" +
        ".head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}" +
        ".stats{display:flex;gap:8px;margin:12px 0 16px;flex-wrap:wrap}" +
        ".stat{border:1px solid #ddd;border-radius:6px;padding:8px 12px;min-width:110px}" +
        ".stat b{display:block;font-size:14px;margin-top:2px}" +
        "table{width:100%;border-collapse:collapse;font-size:10px}th{text-align:left;border-bottom:1px solid #999;padding:6px 4px;font-size:9px;text-transform:uppercase;letter-spacing:.05em}" +
        "td{padding:5px 4px;border-bottom:1px solid #eee}.n{text-align:right;white-space:nowrap}" +
        ".empty{text-align:center;padding:20px}" +
        "tfoot td{font-weight:700;border-top:2px solid #111;border-bottom:none;padding-top:8px}" +
        ".foot{margin-top:24px;font-size:9px;color:#777;display:flex;justify-content:space-between}" +
        "</style></head><body>" +
        '<div class="head"><div class="row" style="gap:12px;align-items:center">' +
        '<img src="' + logo + '" alt="" style="height:54px;width:auto">' +
        "<div><h1>" + U.esc(shopName) + "</h1>" +
        '<div class="muted">' + U.esc(contact) + "</div></div></div>" +
        '<div style="text-align:right"><strong>' + U.esc(title) + "</strong><div class='muted'>" +
        U.esc(data.range.label) + "</div><div class='muted'>Printed " + U.dateTime(Date.now()) + "</div></div></div>" +
        '<div class="stats">' +
        '<div class="stat">Bills<b>' + sum.count + "</b></div>" +
        '<div class="stat">Total sales<b>' + U.money(sum.total) + "</b></div>" +
        '<div class="stat">Received<b>' + U.money(sum.paid) + "</b></div>" +
        '<div class="stat">Remaining<b>' + U.money(sum.balance) + "</b></div>" +
        '<div class="stat">Net profit<b>' + U.money(sum.profit) + "</b></div>" +
        "</div>" + table +
        '<div class="foot"><span>' + U.esc(shopName) + " POS</span><span>Signature: ______________________</span></div>" +
        "</body></html>";
    }

    UI.printHTML(html);
  }

  views.reports = {
    title: "Sales Reports",
    subtitle: "Daily, weekly and monthly performance",

    render: function () {
      var data = reportData();
      var range = data.range;
      var sum = data.sum;
      var maxVal = Math.max(1, sum.total);

      return '<div class="stack">' +

        '<div class="card">' +
        head("Report filters", "Pick a period, then print or review the numbers",
          '<span class="badge ok">Live data</span>') +
        '<div class="card-body">' +
        '<div class="report-filters">' +
        '<div class="field"><label>Report</label><select class="select" id="rep-type">' +
        '<option value="daily"' + (repType === "daily" ? " selected" : "") + ">Daily</option>" +
        '<option value="week"' + (repType === "week" ? " selected" : "") + ">Weekly</option>" +
        '<option value="month"' + (repType === "month" ? " selected" : "") + ">Monthly</option>" +
        "</select></div>" +
        '<div class="field"><label>Date</label><input class="input" id="rep-date" type="date" value="' + U.dateKey(repAnchor) + '"></div>' +
        '<div class="row" style="gap:6px">' +
        '<button class="btn-icon" id="rep-prev" title="Previous">' + UI.icon("left", 17) + "</button>" +
        '<button class="btn" id="rep-today">Today</button>' +
        '<button class="btn-icon" id="rep-next" title="Next">' + UI.icon("right", 17) + "</button>" +
        "</div>" +
        '<button class="btn" id="rep-show">' + UI.icon("refresh", 16) + " Show</button>" +
        '<button class="btn btn-primary" id="rep-print">' + UI.icon("printer", 16) + " Print report</button>" +
        "</div>" +
        '<div class="report-summary">' +
        '<div class="report-stat"><div class="rs-label">Bills</div><div class="rs-value">' + U.num(sum.count, 0) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Total sales</div><div class="rs-value">' + U.money(sum.total) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Received</div><div class="rs-value">' + U.money(sum.paid) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Remaining</div><div class="rs-value ' + (sum.balance > 0 ? "neg" : "") + '">' + U.money(sum.balance) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Net profit</div><div class="rs-value pos">' + U.money(sum.profit) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Avg bill</div><div class="rs-value">' + U.money(sum.avg) + "</div></div>" +
        "</div>" +
        '<div class="row-between" style="margin-bottom:10px">' +
        '<div><div class="card-title" style="font-size:15px">' + U.esc((repType === "daily" ? "Daily" : repType === "week" ? "Weekly" : "Monthly") + " report") + "</div>" +
        '<div class="card-sub">' + U.esc(range.label) + " · " + U.dateShort(range.from) + " – " + U.dateShort(range.to - 1) + "</div></div>" +
        '<span class="badge outline">' + (S.dayOpen() ? "Day open" : "Day ended") + "</span>" +
        "</div>" +
        reportTableHTML(data) +
        "</div></div>" +

        "</div>";
    },

    mount: function (root) {
      var typeEl = root.querySelector("#rep-type");
      var dateEl = root.querySelector("#rep-date");

      typeEl.addEventListener("change", function () {
        repType = typeEl.value;
        global.POS.app.refresh();
      });

      dateEl.addEventListener("change", function () {
        repAnchor = parseDateInput(dateEl.value);
        global.POS.app.refresh();
      });

      root.querySelector("#rep-prev").addEventListener("click", function () {
        shiftAnchor(-1);
        global.POS.app.refresh();
      });
      root.querySelector("#rep-next").addEventListener("click", function () {
        shiftAnchor(1);
        global.POS.app.refresh();
      });
      root.querySelector("#rep-today").addEventListener("click", function () {
        repAnchor = U.startOfDay(Date.now());
        global.POS.app.refresh();
      });
      root.querySelector("#rep-show").addEventListener("click", function () {
        repAnchor = parseDateInput(dateEl.value);
        global.POS.app.refresh();
        UI.toast("Report updated.");
      });
      root.querySelector("#rep-print").addEventListener("click", function () {
        printReport(reportData());
      });
    },
  };

  /* ============================================================
     Settings
     ============================================================ */

  views.settings = {
    title: "Settings",
    subtitle: "Account, day control and appearance",

    render: function () {
      var shop = S.db.shop;
      var pref = S.db.prefs.theme || "dark";
      var sizeKb = Math.round(JSON.stringify(S.db).length / 1024);
      var low = S.lowStock().length;

      var themeOpts = [
        ["light", "Light", "sun"],
        ["dark", "Dark", "moon"],
        ["system", "System", "monitor"],
      ].map(function (t) {
        return '<button type="button" class="theme-opt ' + (pref === t[0] ? "active" : "") + '" data-theme-opt="' + t[0] + '">' +
          '<span class="swatch"></span><span>' + UI.icon(t[2], 14) + " " + t[1] + "</span></button>";
      }).join("");

      return '<div class="settings-grid">' +

        '<div class="settings-stack">' +

        '<div class="card">' +
        head("Account", "Signed in as " + U.esc(S.db.auth.username)) +
        '<div class="card-body">' +
        '<div class="field"><label>Current password</label><input class="input" id="set-current" type="password" placeholder="Current password" autocomplete="current-password"></div>' +
        '<div class="field" style="margin-top:12px"><label>New password</label><input class="input" id="set-next" type="password" placeholder="At least 6 characters" autocomplete="new-password"></div>' +
        '<button class="btn btn-primary btn-block" id="set-pass" style="margin-top:14px">Update password</button>' +
        '<p class="small muted" style="margin-top:10px">Stored securely (hashed) in your shop database. Use a password you can remember.</p>' +
        "</div></div>" +

        '<div class="card">' +
        head("Appearance", "Choose the theme that feels best at your counter") +
        '<div class="card-body">' +
        '<div class="theme-picker">' + themeOpts + "</div>" +
        '<p class="small muted" style="margin-top:12px">Dark surfaces reduce glare during long shifts. Your choice is saved for the next visit.</p>' +
        "</div></div>" +

        '<div class="card">' +
        head("Shop profile", "Printed on every receipt and report") +
        '<div class="card-body">' +
        '<div class="form-grid">' +
        '<div class="field span-2"><label>Shop name (locked)</label><input class="input" id="set-shop-name" value="' + U.esc(shop.name) + '" disabled title="Shop name is locked and cannot be changed"></div>' +
        '<p class="small muted span-2" style="margin-top:-4px">The registered shop name is locked. Contact the developer if it needs to change.</p>' +
        '<div class="field span-2"><label>Legal name (printed on bills)</label><input class="input" id="set-shop-legal" value="' + U.esc(shop.legalName || shop.name) + '"></div>' +
        '<div class="field span-2"><label>Address</label><input class="input" id="set-shop-address" value="' + U.esc(shop.address || "") + '"></div>' +
        '<div class="field"><label>Phone</label><input class="input" id="set-shop-phone" value="' + U.esc(shop.phone || "") + '" inputmode="tel"></div>' +
        '<div class="field"><label>Email</label><input class="input" id="set-shop-email" type="email" value="' + U.esc(shop.email || "") + '" autocomplete="email"></div>' +
        '<div class="field"><label>Currency label</label><input class="input" id="set-shop-currency" value="' + U.esc(shop.currency) + '" maxlength="6"></div>' +
        "</div>" +
        '<button class="btn btn-primary" id="set-shop-save" style="margin-top:14px">' + UI.icon("check", 16) + " Save profile</button>" +
        "</div></div>" +

        '<div class="card">' +
        head("Printing", "Optimised for dot matrix bills and reports") +
        '<div class="card-body">' +
        '<div class="form-grid">' +
        '<div class="field"><label>Bill printer</label><select class="select" id="set-bill-printer">' +
        '<option value="dot"' + ((shop.billPrinter || "dot") === "dot" ? " selected" : "") + ">Dot matrix (recommended)</option>" +
        '<option value="thermal"' + (shop.billPrinter === "thermal" ? " selected" : "") + ">Thermal 80mm</option>" +
        "</select></div>" +
        '<div class="field"><label>Bill paper</label><select class="select" id="set-bill-paper">' +
        '<option value="9.5x5.5"' + ((shop.billPaper || "9.5x5.5") === "9.5x5.5" ? " selected" : "") + ">9.5 × 5.5 in (continuous)</option>" +
        '<option value="9.5x11"' + (shop.billPaper === "9.5x11" ? " selected" : "") + ">9.5 × 11 in</option>" +
        '<option value="a4"' + (shop.billPaper === "a4" ? " selected" : "") + ">A4</option>" +
        "</select></div>" +
        '<div class="field"><label>Sales report paper</label><select class="select" id="set-report-paper">' +
        '<option value="9.5x11"' + ((shop.reportPaper || "9.5x11") === "9.5x11" ? " selected" : "") + ">9.5 × 11 in (continuous)</option>" +
        '<option value="a4"' + (shop.reportPaper === "a4" ? " selected" : "") + ">A4</option>" +
        "</select></div>" +
        "</div>" +
        '<div class="row" style="gap:8px;margin-top:14px">' +
        '<button class="btn btn-primary" id="set-print-save">Save print settings</button>' +
        '<button class="btn" id="set-print-test">' + UI.icon("printer", 15) + " Test bill</button>" +
        "</div>" +
        '<p class="small muted" style="margin-top:10px">Dot matrix mode uses a monospaced, high-contrast layout with no images or colour, sized for continuous paper.</p>' +
        "</div></div>" +

        "</div>" +

        '<div class="settings-stack">' +

        '<div class="card">' +
        head("Sales target", "The daily goal compared with today's sales") +
        '<div class="card-body">' +
        '<div class="field"><label>Daily target</label><input class="input" id="set-target" type="number" min="0" step="100" value="' + Number(shop.target || 0) + '" inputmode="numeric"></div>' +
        '<div class="row" style="gap:6px;margin-top:10px">' +
        [10000, 25000, 50000, 100000].map(function (v) {
          return '<button class="btn btn-sm" data-target="' + v + '">' + U.num(v, 0) + "</button>";
        }).join("") +
        "</div>" +
        '<button class="btn btn-primary btn-block" id="set-target-save" style="margin-top:12px">Save target</button>' +
        "</div></div>" +

        '<div class="card">' +
        head("Daily operations", "How a selling day starts and ends",
          S.dayOpen() ? '<span class="badge ok">Day open</span>' : '<span class="badge warn">Day closed</span>') +
        '<div class="card-body">' +
        '<label class="check" style="margin-bottom:12px"><input type="checkbox" id="set-autostart"' + (S.db.prefs.autoStart ? " checked" : "") + "> Start each day automatically at 12:00 midnight</label>" +
        '<p class="small muted" style="margin-bottom:14px">Day End closes the counter and prints the daily report. Start Day opens a fresh counter.</p>' +
        '<div class="row" style="gap:8px">' +
        '<button class="btn btn-sm" id="set-start"' + (S.dayOpen() ? " disabled" : "") + ">Start Day</button>" +
        '<button class="btn btn-sm" id="set-end"' + (S.dayOpen() ? "" : " disabled") + ">Day End</button>" +
        '<button class="btn btn-sm" id="set-reopen"' + (S.dayOpen() ? " disabled" : "") + ">Re-open day</button>" +
        "</div>" +
        '<div class="about-row" style="margin-top:14px"><span>Counter opened</span><strong>' + U.dateTime(S.db.day.openedAt) + "</strong></div>" +
        '<div class="about-row"><span>Low stock alerts</span><strong>' + (low ? low + " item(s)" : "None") + "</strong></div>" +
        "</div></div>" +

        '<div class="card">' +
        head("Data &amp; backup", "Stored safely in MySQL on your server") +
        '<div class="card-body">' +
        '<div class="about-row"><span>Storage used</span><strong>' + sizeKb + " KB</strong></div>" +
        '<div class="about-row"><span>Bills stored</span><strong>' + U.num(S.db.bills.length, 0) + "</strong></div>" +
        '<div class="about-row"><span>Items stored</span><strong>' + U.num(S.db.items.length, 0) + "</strong></div>" +
        '<div class="row" style="gap:8px;margin-top:14px">' +
        '<button class="btn btn-sm" id="set-export">' + UI.icon("download", 15) + " Export backup</button>" +
        '<button class="btn btn-sm" id="set-import">' + UI.icon("upload", 15) + " Import</button>" +
        "</div>" +
        '<input type="file" id="set-file" accept="application/json,.json" style="display:none">' +
        '<div class="row" style="gap:8px;margin-top:8px">' +
        '<button class="btn btn-sm btn-danger" id="set-clear-sales">Delete all bills</button>' +
        '<button class="btn btn-sm btn-danger" id="set-reset">Factory reset</button>' +
        "</div>" +
        "</div></div>" +

        '<div class="card">' +
        head("Quick guide", "A few useful habits") +
        '<div class="card-body">' +
        '<div class="about-row"><span>Search</span><strong>Type a name, category or id in POS Billing</strong></div>' +
        '<div class="about-row"><span>Enter</span><strong>Adds the first matching product</strong></div>' +
        '<div class="about-row"><span>Stock</span><strong>Rows turn amber when reorder level is reached</strong></div>' +
        '<div class="about-row"><span>Bills</span><strong>Open Transactions to reprint any bill</strong></div>' +
        "</div></div>" +

        '<div class="card">' +
        head("About", "Austerra Agri Solutions POS · version 2.0 · PHP + MySQL") +
        '<div class="card-body">' +
        '<div class="row" style="gap:12px;align-items:center">' +
        '<div class="brand-mark has-logo" style="width:46px;height:46px;flex-basis:46px"><img src="assets/img/austerra-logo.jpeg" alt="Austerra logo"></div>' +
        "<div><div class='fw-600'>" + U.esc(shop.legalName || shop.name) + "</div><div class='small muted'>" + U.esc(shop.address || "") + "</div>" +
        (shop.phone ? "<div class='small muted'>" + U.esc(shop.phone) + (shop.email ? " · " + U.esc(shop.email) : "") + "</div>" : "") + "</div>" +
        "</div>" +
        '<div class="about-row" style="margin-top:12px"><span>Database</span><strong>MySQL on your shop server</strong></div>' +
        '<div class="about-row"><span>Signed in</span><strong>' + U.esc(S.db.auth.username) + "</strong></div>" +
        '<div class="row" style="gap:8px;margin-top:14px">' +
        '<button class="btn btn-sm" id="set-signout">' + UI.icon("logout", 15) + " Sign out</button>" +
        "</div>" +
        '<div class="about-credit">Created by Pavan Ranasinghe · 071 7398813</div>' +
        "</div></div>" +

        "</div>" +
        "</div>";
    },

    mount: function (root) {
      /* password */
      root.querySelector("#set-pass").addEventListener("click", function () {
        var cur = root.querySelector("#set-current").value;
        var next = root.querySelector("#set-next").value;
        var passBtn = root.querySelector("#set-pass");
        passBtn.disabled = true;
        S.changePassword(cur, next).then(function (err) {
          passBtn.disabled = false;
          if (err) { UI.toast(err, "err"); return; }
          root.querySelector("#set-current").value = "";
          root.querySelector("#set-next").value = "";
          UI.toast("Password updated.", "ok");
        });
      });

      /* theme */
      root.querySelectorAll("[data-theme-opt]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          S.db.prefs.theme = btn.getAttribute("data-theme-opt");
          S.save();
          global.POS.app.applyTheme();
          global.POS.app.refresh();
        });
      });

      /* shop profile */
      root.querySelector("#set-shop-save").addEventListener("click", function () {
        var name = S.db.shop.name;
        S.db.shop.legalName = root.querySelector("#set-shop-legal").value.trim() || name;
        S.db.shop.address = root.querySelector("#set-shop-address").value.trim();
        S.db.shop.phone = root.querySelector("#set-shop-phone").value.trim();
        S.db.shop.email = root.querySelector("#set-shop-email").value.trim();
        S.db.shop.currency = root.querySelector("#set-shop-currency").value.trim() || "Rs.";
        S.save();
        UI.toast("Shop profile saved.", "ok");
        global.POS.app.refresh();
      });

      /* printing */
      root.querySelector("#set-print-save").addEventListener("click", function () {
        S.db.shop.billPrinter = root.querySelector("#set-bill-printer").value;
        S.db.shop.billPaper = root.querySelector("#set-bill-paper").value;
        S.db.shop.reportPaper = root.querySelector("#set-report-paper").value;
        S.save();
        UI.toast("Print settings saved.", "ok");
        global.POS.app.refresh();
      });

      root.querySelector("#set-print-test").addEventListener("click", function () {
        var bills = S.db.bills;
        if (!bills.length) {
          UI.toast("Complete a sale first, then print a test bill.", "warn");
          return;
        }
        UI.printReceipt(bills[bills.length - 1]);
      });

      /* target */
      root.querySelector("#set-target-save").addEventListener("click", function () {
        S.db.shop.target = Math.max(0, Number(root.querySelector("#set-target").value) || 0);
        S.save();
        UI.toast("Sales target saved.", "ok");
        global.POS.app.refresh();
      });
      root.querySelectorAll("[data-target]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelector("#set-target").value = btn.getAttribute("data-target");
        });
      });

      /* daily ops */
      root.querySelector("#set-autostart").addEventListener("change", function (e) {
        S.db.prefs.autoStart = e.target.checked;
        S.save();
        UI.toast(e.target.checked ? "Auto start enabled." : "Auto start disabled.");
      });

      root.querySelector("#set-start").addEventListener("click", function () {
        S.startDay();
        UI.toast("Day started.", "ok");
        global.POS.app.refresh();
      });

      root.querySelector("#set-reopen").addEventListener("click", function () {
        S.startDay();
        UI.toast("Day re-opened.", "ok");
        global.POS.app.refresh();
      });

      root.querySelector("#set-end").addEventListener("click", function () {
        global.POS.app.dayEndFlow();
      });

      /* backup */
      root.querySelector("#set-export").addEventListener("click", function () {
        var btn = root.querySelector("#set-export");
        btn.disabled = true;
        S.exportJSON().then(function (text) {
          btn.disabled = false;
          UI.download("austerra-backup-" + U.dateKey(Date.now()) + ".json", text);
          UI.toast("Backup downloaded.", "ok");
        }).catch(function (err) {
          btn.disabled = false;
          UI.toast(err && err.message ? err.message : "Could not export a backup.", "err");
        });
      });

      root.querySelector("#set-import").addEventListener("click", function () {
        root.querySelector("#set-file").click();
      });

      root.querySelector("#set-file").addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          UI.confirm({
            title: "Restore this backup?",
            message: "Your current data will be replaced with the contents of this file.",
            confirmText: "Restore",
            danger: true,
          }).then(function (ok) {
            if (!ok) return;
            S.importJSON(String(reader.result)).then(function (err) {
              if (err) { UI.toast(err, "err"); return; }
              global.POS.app.applyTheme();
              UI.toast("Backup restored.", "ok");
              global.POS.app.refresh();
            });
          });
        };
        reader.readAsText(file);
        e.target.value = "";
      });

      root.querySelector("#set-clear-sales").addEventListener("click", function () {
        UI.confirm({
          title: "Delete all bills?",
          message: "Every transaction and report entry will be removed. Items, customers and settings stay. Stock is not restored.",
          confirmText: "Delete all bills",
          danger: true,
        }).then(function (ok) {
          if (!ok) return;
          S.clearSales().then(function () {
            UI.toast("All bills deleted.", "ok");
            global.POS.app.refresh();
          }).catch(function (err) {
            UI.toast(err && err.message ? err.message : "Could not delete the bills.", "err");
          });
        });
      });

      root.querySelector("#set-reset").addEventListener("click", function () {
        UI.confirm({
          title: "Factory reset?",
          message: "Everything in the shop database — items, customers, bills and settings — will be replaced with a clean shop. This cannot be undone.",
          confirmText: "Reset everything",
          danger: true,
        }).then(function (ok) {
          if (!ok) return;
          S.reset().then(function () {
            global.POS.app.applyTheme();
            UI.toast("Factory reset complete.", "ok");
            global.POS.app.go("overview");
            global.POS.app.refresh();
          }).catch(function (err) {
            UI.toast(err && err.message ? err.message : "Could not reset the shop data.", "err");
          });
        });
      });

      root.querySelector("#set-signout").addEventListener("click", function () {
        global.POS.app.signOut();
      });
    },
  };

  /* ============================================================
     Login
     ============================================================ */

  views.login = {
    render: function () {
      var shop = S.db.shop;
      var isDefaultPass = !!(S.db.auth && S.db.auth.isDefault);
      return '<div class="auth">' +
        '<div class="auth-visual">' +
        '<div class="auth-brand">' +
        '<div class="brand-mark has-logo"><img src="assets/img/austerra-logo.jpeg" alt="Austerra logo"></div>' +
        '<div class="brand-text"><span class="brand-name">' + U.esc(shop.name) + '</span><span class="brand-sub">Agri solutions POS</span></div>' +
        "</div>" +
        '<div class="auth-hero">' +
        "<h1>Run your counter with <em>confidence.</em></h1>" +
        "<p>Fast billing, live stock and clear daily profit — all in one calm place.</p>" +
        '<div class="auth-features">' +
        '<div class="auth-feature">' + UI.icon("check", 16) + " Fast billing &amp; receipt printing</div>" +
        '<div class="auth-feature">' + UI.icon("check", 16) + " Live stock and low-stock alerts</div>" +
        '<div class="auth-feature">' + UI.icon("check", 16) + " Daily / weekly / monthly profit</div>" +
        '<div class="auth-feature">' + UI.icon("check", 16) + " Works on phone, tablet and desktop</div>" +
        "</div>" +
        "</div>" +
        '<div class="auth-foot"><span>' + U.esc(shop.name) + " POS · v1.0</span><span>Created by Pavan Ranasinghe · 071 7398813</span></div>" +
        "</div>" +

        '<div class="auth-panel">' +
        '<div class="auth-form">' +
        '<div class="auth-mobile-brand">' +
        '<div class="brand-mark has-logo"><img src="assets/img/austerra-logo.jpeg" alt="Austerra logo"></div>' +
        '<div class="brand-text"><span class="brand-name">' + U.esc(shop.name) + '</span><span class="brand-sub">Agri solutions POS</span></div>' +
        "</div>" +
        '<div class="row-between">' +
        '<div><h2>Welcome back</h2><p class="auth-sub">Sign in to open your counter.</p></div>' +
        '<button class="btn-icon plain" id="login-theme" data-theme-icon title="Switch theme">' + UI.icon("sun", 18) + "</button>" +
        "</div>" +
        '<form id="login-form" autocomplete="on">' +
        '<div class="field"><label for="login-user">Username</label>' +
        '<input class="input" id="login-user" name="username" type="text" value="' + U.esc(S.db.auth.username) + '" autocomplete="username" required></div>' +
        '<div class="field"><label for="login-pass">Password</label>' +
        '<input class="input" id="login-pass" name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required></div>' +
        '<label class="check" style="margin-top:12px"><input type="checkbox" id="login-show"> Show password</label>' +
        '<div class="auth-error" id="login-error">' + UI.icon("alertCircle", 15) + " <span>Incorrect username or password.</span></div>" +
        '<button class="btn btn-primary btn-lg btn-block" type="submit">' + UI.icon("arrowRight", 18) + " Sign in</button>" +
        "</form>" +
        '<div class="auth-note">' + UI.icon("shield", 16) +
        (isDefaultPass
          ? "<div><strong>Security notice:</strong> you are still using a default password. Change it in Settings after signing in. Shop data is stored on your server.</div>"
          : "<div><strong>Shop server:</strong> your stock, customers and bills are saved in MySQL on your hosting account. Still keep an Export backup regularly.</div>") +
        "</div>" +
        "</div></div>" +
        "</div>";
    },

    mount: function (root) {
      var form = root.querySelector("#login-form");
      var pass = root.querySelector("#login-pass");
      var show = root.querySelector("#login-show");
      var err = root.querySelector("#login-error");
      var themeBtn = root.querySelector("#login-theme");

      if (themeBtn) {
        themeBtn.addEventListener("click", function () {
          S.db.prefs.theme = S.db.prefs.theme === "dark" ? "light" : "dark";
          S.save();
          global.POS.app.applyTheme();
          themeBtn.innerHTML = UI.icon(S.db.prefs.theme === "dark" ? "sun" : "moon", 18);
        });
      }

      if (show) {
        show.addEventListener("change", function () {
          pass.type = show.checked ? "text" : "password";
        });
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var user = root.querySelector("#login-user").value;
        var pw = pass.value;
        var submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;

        S.login(user, pw).then(function (result) {
          if (submit) submit.disabled = false;
          if (result === true) {
            err.classList.remove("show");
            UI.toast("Welcome back, " + S.db.auth.username + "!", "ok");
            global.POS.app.afterLogin();
          } else {
            var label = err.querySelector("span");
            if (label && result) label.textContent = result;
            err.classList.add("show");
            pass.value = "";
            pass.focus();
          }
        });
      });
    },
  };

  /* ============================================================
     Day end report (shared with app)
     ============================================================ */

  views.showDayEndReport = function (bills) {
    var sum = S.summarize(bills);
    var hourly = S.hourly(bills);
    var top = S.topItems(bills, 4);

    UI.modal({
      title: "Day ended",
      subtitle: U.dayFull(Date.now()),
      size: "wide",
      body:
        '<div class="report-summary" style="margin-top:0">' +
        '<div class="report-stat"><div class="rs-label">Bills</div><div class="rs-value">' + U.num(sum.count, 0) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Total sales</div><div class="rs-value">' + U.money(sum.total) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Received</div><div class="rs-value">' + U.money(sum.paid) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Credit</div><div class="rs-value">' + U.money(sum.balance) + "</div></div>" +
        '<div class="report-stat"><div class="rs-label">Net profit</div><div class="rs-value pos">' + U.money(sum.profit) + "</div></div>" +
        "</div>" +
        '<div style="margin-top:6px">' + hourlyChart(hourly) + "</div>" +
        (top.length
          ? '<div class="top-list" style="margin-top:10px">' + top.map(function (t) {
            return '<div class="top-item"><div class="top-rank">' + UI.icon("tag", 13) + "</div>" +
              '<div class="top-meta"><div class="top-name">' + U.esc(t.name) + '</div><div class="top-sub">' + U.num(t.qty) + " sold</div></div>" +
              '<div class="top-value">' + U.money(t.revenue) + "</div></div>";
          }).join("") + "</div>"
          : "") +
        '<p class="small muted" style="margin-top:12px">The counter is now closed. Start a new day from Settings or the billing screen when you are ready.</p>',
      footer: '<button class="btn" data-close>Close</button>' +
        '<button class="btn btn-primary" id="de-print">' + UI.icon("printer", 16) + " Print daily report</button>",
      onMount: function (overlay) {
        overlay.querySelector("#de-print").addEventListener("click", function () {
          repType = "daily";
          repAnchor = U.startOfDay(Date.now());
          var data = { range: S.rangeFor("daily", Date.now()), bills: bills, sum: sum };
          printReport(data);
        });
      },
    });
  };

  views.openBill = openBillModal;
  views.openItemModal = openItemModal;
  views.openCustomerModal = openCustomerModal;
  views.openCustomerHistory = openCustomerHistory;

  global.POS.views = views;
})(window);
