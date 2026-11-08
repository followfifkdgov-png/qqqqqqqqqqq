/* ============================================================
   Austerra Agri Solutions POS - app shell, routing and day control
   ============================================================ */

(function (global) {
  "use strict";

  var S = global.POS.store;
  var U = global.POS.util;
  var UI = global.POS.ui;
  var V = global.POS.views;

  var NAV = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "billing", label: "POS Billing", icon: "cart" },
    { id: "transactions", label: "Transactions", icon: "clock" },
    { id: "inventory", label: "Inventory & Stock", icon: "box" },
    { id: "customers", label: "Customers", icon: "users" },
    { id: "reports", label: "Sales Reports", icon: "chart" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  var TABS = [
    { id: "overview", label: "Home", icon: "grid" },
    { id: "billing", label: "Sell", icon: "cart" },
    { id: "inventory", label: "Stock", icon: "box" },
    { id: "customers", label: "People", icon: "users" },
    { id: "more", label: "More", icon: "more" },
  ];

  var appEl = document.getElementById("app");
  var shellBuilt = false;
  var currentRoute = "overview";

  /* ---------------- theme ---------------- */

  function resolvedTheme() {
    var pref = (S.db.prefs && S.db.prefs.theme) || "dark";
    if (pref === "system") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return pref;
  }

  function applyTheme() {
    var t = resolvedTheme();
    document.documentElement.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0a0c0b" : "#f1f5f2");
    document.querySelectorAll("[data-theme-icon]").forEach(function (el) {
      el.innerHTML = UI.icon(t === "dark" ? "sun" : "moon", 18);
    });
  }

  function toggleTheme() {
    var next = resolvedTheme() === "dark" ? "light" : "dark";
    S.db.prefs.theme = next;
    S.save();
    applyTheme();
    var side = document.querySelector("#side-theme");
    if (side) side.setAttribute("aria-checked", next === "dark" ? "true" : "false");
  }

  /* ---------------- auto day start ---------------- */

  function maybeAutoStart() {
    if (!S.db.prefs.autoStart) return;
    if (S.dayOpen()) return;
    var closedKey = S.db.day.closedAt ? U.dateKey(S.db.day.closedAt) : null;
    if (!closedKey || closedKey < U.dateKey(Date.now())) {
      S.startDay();
    }
  }

  /* ---------------- shell ---------------- */

  function navHTML() {
    var low = S.lowStock().length;
    return NAV.map(function (n) {
      var badge = n.id === "inventory" && low
        ? '<span class="nav-badge" id="nav-badge-inventory">' + low + "</span>"
        : (n.id === "inventory" ? '<span class="nav-badge" id="nav-badge-inventory" style="display:none">0</span>' : "");
      return '<button class="nav-item" data-nav="' + n.id + '" title="' + U.esc(n.label) + '" aria-label="' + U.esc(n.label) + '">' +
        UI.icon(n.icon, 20) +
        '<span class="nav-text">' + n.label + "</span>" + badge +
        "</button>";
    }).join("");
  }

  function tabsHTML() {
    return TABS.map(function (t) {
      return '<button class="tab" data-nav="' + t.id + '">' +
        UI.icon(t.icon, 21) + "<span>" + t.label + "</span></button>";
    }).join("");
  }

  function buildShell() {
    var initials = UI.initials(S.db.auth.username);

    appEl.innerHTML =
      '<div class="app">' +
      '<aside class="sidebar">' +
      '<div class="brand">' +
      '<div class="brand-mark has-logo"><img src="assets/img/austerra-logo.jpeg" alt="Austerra logo"></div>' +
      '<div class="brand-text"><span class="brand-name">' + U.esc(S.db.shop.name) + '</span>' +
      '<span class="brand-sub">Agri solutions</span></div>' +
      '<span class="pill">POS</span>' +
      "</div>" +
      '<div class="grow">' +
      '<div class="nav-label">Menu</div>' +
      '<nav class="nav">' + navHTML() + "</nav>" +
      "</div>" +
      '<div class="counter-card">' +
      '<div class="eyebrow">Today\'s counter</div>' +
      '<div class="counter-date" id="counter-date"></div>' +
      '<div class="counter-state" id="counter-state"><span class="dot"></span><span>Open and selling</span></div>' +
      '<div class="counter-user" id="counter-user"></div>' +
      '<button class="btn btn-accent btn-sm" data-nav="billing">' + UI.icon("plus", 15) + " New sale</button>" +
      "</div>" +
      '<div class="sidebar-foot">' +
      '<span class="foot-label">Dark mode</span>' +
      '<button class="switch" id="side-theme" role="switch" aria-checked="true" aria-label="Toggle dark mode"></button>' +
      "</div>" +
      '<button class="signout-btn" data-signout>' + UI.icon("logout", 17) + "<span>Sign out</span></button>" +
      "</aside>" +

      '<div class="main">' +
      '<header class="topbar">' +
      '<div class="topbar-titles">' +
      '<h1 id="page-title">Overview</h1>' +
      '<p class="subtitle" id="page-sub"></p>' +
      "</div>" +
      '<div class="topbar-right">' +
      '<div class="day-chip">' +
      '<span class="day-state" id="day-state"><span class="dot"></span>Day open</span>' +
      '<span class="day-time" id="day-time"></span>' +
      "</div>" +
      '<button class="btn" id="top-dayend">' + UI.icon("calendar", 16) + "<span class='nowrap'>Day End</span></button>" +
      '<button class="btn-icon" id="top-theme" data-theme-icon title="Switch theme" aria-label="Switch theme"></button>' +
      '<button class="avatar-btn" id="top-avatar" aria-label="Account menu">' +
      '<span class="avatar">' + U.esc(initials) + "</span>" +
      '<span class="avatar-meta"><strong>' + U.esc(S.db.auth.username) + "</strong><span>Administrator</span></span>" +
      "</button>" +
      "</div>" +
      "</header>" +
      '<main class="view" id="view"></main>' +
      "</div>" +
      "</div>" +

      '<nav class="tabbar">' + tabsHTML() + "</nav>";

    shellBuilt = true;

    var side = appEl.querySelector("#side-theme");
    if (side) {
      side.setAttribute("aria-checked", resolvedTheme() === "dark" ? "true" : "false");
      side.addEventListener("click", toggleTheme);
    }
    var topTheme = appEl.querySelector("#top-theme");
    if (topTheme) topTheme.addEventListener("click", toggleTheme);
    var dayEnd = appEl.querySelector("#top-dayend");
    if (dayEnd) dayEnd.addEventListener("click", dayEndFlow);
    var avatar = appEl.querySelector("#top-avatar");
    if (avatar) avatar.addEventListener("click", openAccountMenu);

    updateChrome();
    applyTheme();
  }

  function onShellClick(e) {
    var nav = e.target.closest("[data-nav]");
    if (nav) {
      var id = nav.getAttribute("data-nav");
      if (id === "more") { openMoreSheet(); return; }
      go(id);
      return;
    }
    if (e.target.closest("[data-signout]")) {
      signOut();
    }
  }

  function updateChrome() {
    var view = V[currentRoute] || V.overview;
    var titleEl = document.getElementById("page-title");
    var subEl = document.getElementById("page-sub");
    if (titleEl) titleEl.textContent = view.title;
    if (subEl) subEl.textContent = view.subtitle || "";

    var open = S.dayOpen();
    var stateEl = document.getElementById("day-state");
    var timeEl = document.getElementById("day-time");
    if (stateEl) {
      stateEl.className = "day-state" + (open ? "" : " closed");
      stateEl.innerHTML = '<span class="dot"></span>' + (open ? "Day open" : "Day closed");
    }
    if (timeEl) {
      timeEl.textContent = open
        ? U.dateShort(Date.now()) + " · " + U.timeShort(Date.now())
        : "Closed " + U.timeShort(S.db.day.closedAt || Date.now());
    }

    var cDate = document.getElementById("counter-date");
    if (cDate) cDate.textContent = U.dayFull(Date.now());
    var cState = document.getElementById("counter-state");
    if (cState) {
      cState.innerHTML = '<span class="dot"></span><span>' + (open ? "Open and selling" : "Closed for the day") + "</span>";
      if (!open) cState.style.color = "var(--warn)";
    }
    var cUser = document.getElementById("counter-user");
    if (cUser) cUser.textContent = "Cashier · " + S.db.auth.username;

    var dayEndBtn = document.getElementById("top-dayend");
    if (dayEndBtn) {
      dayEndBtn.disabled = !open;
      dayEndBtn.style.opacity = open ? "" : "0.45";
    }

    var badge = document.getElementById("nav-badge-inventory");
    if (badge) {
      var low = S.lowStock().length;
      badge.textContent = low;
      badge.style.display = low ? "" : "none";
    }

    document.querySelectorAll(".nav-item").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-nav") === currentRoute);
    });
    var tabActive = ["transactions", "reports", "settings"].indexOf(currentRoute) !== -1 ? "more" : currentRoute;
    document.querySelectorAll(".tab").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-nav") === tabActive);
    });
  }

  /* ---------------- routing ---------------- */

  function routeFromHash() {
    var h = (location.hash || "").replace(/^#\/?/, "").trim();
    return V[h] && h !== "login" ? h : "overview";
  }

  function go(route) {
    if (route === currentRoute && location.hash === "#/" + route) {
      refresh();
      return;
    }
    if (location.hash === "#/" + route) {
      refresh({ scroll: true });
    } else {
      location.hash = "#/" + route;
    }
  }

  function onHash() {
    if (!S.isAuthed()) return;
    var next = routeFromHash();
    currentRoute = next;
    refresh({ scroll: true });
  }

  function refresh(opts) {
    if (!S.isAuthed()) {
      renderAuth();
      return;
    }
    if (!shellBuilt) buildShell();
    currentRoute = routeFromHash();
    updateChrome();
    renderView();
    if (opts && opts.scroll) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function renderView() {
    var view = V[currentRoute] || V.overview;
    var old = document.getElementById("view");
    var viewEl = document.createElement("main");
    viewEl.id = "view";
    viewEl.className = "view";
    if (old && old.parentNode) {
      old.parentNode.replaceChild(viewEl, old);
    } else {
      var main = document.querySelector(".main");
      if (main) main.appendChild(viewEl);
    }
    viewEl.innerHTML = view.render();
    if (view.mount) view.mount(viewEl);
  }

  /* ---------------- auth ---------------- */

  function renderAuth() {
    shellBuilt = false;
    currentRoute = "overview";
    appEl.innerHTML = V.login.render();
    V.login.mount(appEl);
    applyTheme();
  }

  function afterLogin() {
    shellBuilt = false;
    if (location.hash !== "#/overview") {
      history.replaceState(null, "", "#/overview");
    }
    currentRoute = "overview";
    buildShell();
    refresh({ scroll: true });
  }

  function signOut() {
    UI.confirm({
      title: "Sign out?",
      message: "You will need your password to open the counter again. Your data stays safely saved on your shop server.",
      confirmText: "Sign out",
      danger: true,
    }).then(function (ok) {
      if (!ok) return;
      S.logout().then(function () {
        UI.closeModal();
        history.replaceState(null, "", location.pathname + location.search);
        renderAuth();
        UI.toast("Signed out.");
      });
    });
  }

  /* ---------------- account menu ---------------- */

  function openAccountMenu() {
    var initials = UI.initials(S.db.auth.username);
    UI.modal({
      title: "Account",
      subtitle: "Austerra Agri Solutions POS · server database",
      size: "slim",
      body:
        '<div class="row" style="gap:12px;margin-bottom:14px">' +
        '<span class="avatar" style="width:44px;height:44px;flex-basis:44px;font-size:16px">' + U.esc(initials) + "</span>" +
        "<div><div class='fw-600'>" + U.esc(S.db.auth.username) + "</div><div class='small muted'>Administrator</div></div>" +
        '<span class="badge ' + (S.dayOpen() ? "ok" : "warn") + '" style="margin-left:auto">' + (S.dayOpen() ? "Day open" : "Day closed") + "</span>" +
        "</div>" +
        '<div class="about-row"><span>Shop</span><strong>' + U.esc(S.db.shop.legalName || S.db.shop.name) + "</strong></div>" +
        '<div class="about-row"><span>Today</span><strong>' + U.dayFull(Date.now()) + "</strong></div>" +
        '<div class="row" style="gap:8px;margin-top:16px;flex-direction:column">' +
        '<button class="btn btn-block" id="acc-settings">' + UI.icon("settings", 16) + " Settings</button>" +
        '<button class="btn btn-block" id="acc-dayend">' + UI.icon("calendar", 16) + " Day end</button>" +
        '<button class="btn btn-block btn-danger" id="acc-signout">' + UI.icon("logout", 16) + " Sign out</button>" +
        "</div>",
      footer: '<button class="btn" data-close>Close</button>',
      onMount: function (overlay) {
        overlay.querySelector("#acc-settings").addEventListener("click", function () {
          UI.closeModal();
          go("settings");
        });
        overlay.querySelector("#acc-dayend").addEventListener("click", function () {
          UI.closeModal();
          dayEndFlow();
        });
        overlay.querySelector("#acc-signout").addEventListener("click", function () {
          UI.closeModal();
          signOut();
        });
      },
    });
  }

  /* ---------------- mobile more sheet ---------------- */

  function openMoreSheet() {
    var panel = UI.sheet(
      '<div class="sheet-title">More</div>' +
      '<button class="sheet-item" data-sheet-nav="transactions">' + UI.icon("clock", 19) + " Transactions</button>" +
      '<button class="sheet-item" data-sheet-nav="reports">' + UI.icon("chart", 19) + " Sales Reports</button>" +
      '<button class="sheet-item" data-sheet-nav="settings">' + UI.icon("settings", 19) + " Settings</button>" +
      '<div class="sheet-title">Quick actions</div>' +
      '<button class="sheet-item" data-sheet-act="theme">' + UI.icon(resolvedTheme() === "dark" ? "sun" : "moon", 19) + " Switch to " + (resolvedTheme() === "dark" ? "light" : "dark") + " mode</button>" +
      '<button class="sheet-item" data-sheet-act="dayend">' + UI.icon("calendar", 19) + " Day end</button>" +
      '<button class="sheet-item danger" data-sheet-act="signout">' + UI.icon("logout", 19) + " Sign out</button>"
    );

    panel.addEventListener("click", function (e) {
      var nav = e.target.closest("[data-sheet-nav]");
      if (nav) {
        UI.closeSheet();
        go(nav.getAttribute("data-sheet-nav"));
        return;
      }
      var act = e.target.closest("[data-sheet-act]");
      if (!act) return;
      var a = act.getAttribute("data-sheet-act");
      UI.closeSheet();
      if (a === "theme") toggleTheme();
      if (a === "dayend") dayEndFlow();
      if (a === "signout") signOut();
    });
  }

  /* ---------------- day end ---------------- */

  function dayEndFlow() {
    if (!S.dayOpen()) {
      UI.toast("The day is already closed. Start a new day from Settings.", "warn");
      return;
    }
    var bills = S.billsSince(S.db.day.openedAt);
    var sum = S.summarize(bills);

    UI.confirm({
      title: "End the day?",
      message: "<strong>" + bills.length + " bills</strong> · <strong>" + U.money(sum.total) +
        "</strong> sales today.<br><br>The counter will close. You can print the daily report and re-open the day later if needed.",
      confirmText: "Day End",
    }).then(function (ok) {
      if (!ok) return;
      var dayBills = S.dayEnd();
      UI.toast("Day ended. Counter closed.", "ok");
      refresh();
      V.showDayEndReport(dayBills);
    });
  }

  /* ---------------- boot ---------------- */

  function renderBootError(err) {
    var msg = err && err.message ? err.message : "Could not reach your shop server.";
    appEl.innerHTML =
      '<div style="min-height:100vh;display:grid;place-items:center;padding:24px">' +
      '<div style="max-width:430px;width:100%;background:#111614;border:1px solid #22302a;border-radius:16px;padding:26px;text-align:center;color:#e8ece9;font-family:system-ui,sans-serif">' +
      '<div style="font-size:19px;font-weight:700;margin-bottom:8px">Cannot open the counter</div>' +
      '<p style="color:#9aa79e;font-size:14px;line-height:1.6;margin:0 0 18px">' + U.esc(msg) + "</p>" +
      '<button id="boot-retry" style="width:100%;padding:12px;border:0;border-radius:10px;background:#c9541c;color:#fff;font-weight:700;font-size:14px;cursor:pointer">Try again</button>' +
      '<p style="color:#78877e;font-size:12px;line-height:1.6;margin:16px 0 0">New installation? Open <strong>install.php</strong> first.<br>Already installed? Check the database details in <strong>config.php</strong>.</p>' +
      "</div></div>";

    var retry = document.getElementById("boot-retry");
    if (retry) retry.addEventListener("click", function () { location.reload(); });
  }

  function onAuthLost() {
    try { S.logoutLocal(); } catch (e) {}
    shellBuilt = false;
    currentRoute = "overview";
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    renderAuth();
    UI.toast("Your session expired. Please sign in again.", "warn");
  }

  function init() {
    S.load().then(startApp).catch(renderBootError);
  }

  function startApp() {
    applyTheme();

    appEl.addEventListener("click", onShellClick);

    if (!S.isAuthed()) {
      renderAuth();
    } else {
      maybeAutoStart();
      currentRoute = routeFromHash();
      buildShell();
      refresh();
    }

    window.addEventListener("hashchange", onHash);

    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      if (mq.addEventListener) {
        mq.addEventListener("change", function () {
          if ((S.db.prefs.theme || "dark") === "system") applyTheme();
        });
      }
    }

    setInterval(function () {
      var t = document.getElementById("day-time");
      if (t && S.dayOpen()) t.textContent = U.dateShort(Date.now()) + " · " + U.timeShort(Date.now());
    }, 30000);

    // Nice small shortcut: Ctrl/Cmd + K focuses the search on the page
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        var input = document.querySelector("#product-search, #tx-search, #inv-search, #cus-search");
        if (input) { e.preventDefault(); input.focus(); input.select(); }
      }
    });

    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline file mode */ });
    }
  }

  global.POS.app = {
    go: go,
    refresh: refresh,
    afterLogin: afterLogin,
    signOut: signOut,
    onAuthLost: onAuthLost,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    dayEndFlow: dayEndFlow,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
