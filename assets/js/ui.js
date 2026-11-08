/* ============================================================
   Austerra Agri Solutions POS - UI kit
   Inline icons, modals, toasts, sheets and printing.
   ============================================================ */

(function (global) {
  "use strict";

  var U = global.POS.util;

  /* ---------------- icons ---------------- */

  var PATHS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    menu: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
    down: '<polyline points="6 9 12 15 18 9"/>',
    left: '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    up: '<polyline points="18 15 12 9 6 15"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    alertCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    bank: '<path d="M3 10h18"/><path d="M5 10V6l7-3 7 3v4"/><path d="M6 14v5M10 14v5M14 14v5M18 14v5"/><path d="M3 21h18"/>',
    cheque: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h4M7 14h7"/><path d="m15 14 2 2 3-3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h1.5a2 2 0 0 0 0-4H9v6"/><path d="M14.5 13a2.5 2.5 0 0 1 0 4h-1V11h1a2.5 2.5 0 0 1 2.5 2.5"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    phoneDevice: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    wifiOff: '<line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 12.55a10 10 0 0 1 5.17-2.39"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  };

  function icon(name, size, cls) {
    var p = PATHS[name] || PATHS.info;
    var s = size || 18;
    return '<svg class="' + (cls || "") + '" width="' + s + '" height="' + s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      p + "</svg>";
  }

  /* ---------------- toast ---------------- */

  var toastRoot = null;

  function toast(message, type) {
    if (!toastRoot) toastRoot = document.getElementById("toast-root");
    if (!toastRoot) return;

    var kind = type || "ok";
    var map = { ok: "checkCircle", err: "alertCircle", warn: "alert", info: "info" };
    var el = document.createElement("div");
    el.className = "toast " + kind;
    el.innerHTML = '<span class="t-icon">' + icon(map[kind] || "info", 17) + "</span><span>" + U.esc(message) + "</span>";
    toastRoot.appendChild(el);

    setTimeout(function () {
      el.classList.add("leaving");
      setTimeout(function () { el.remove(); }, 220);
    }, kind === "err" ? 4200 : 2800);
  }

  /* ---------------- modal ---------------- */

  var current = null;

  function closeModal() {
    if (!current) return;
    var overlay = current;
    current = null;
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity .16s";
    setTimeout(function () { overlay.remove(); }, 160);
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }

  function modal(opts) {
    closeModal();
    var root = document.getElementById("modal-root");
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    var footer = "";
    if (opts.footer) {
      footer = '<div class="modal-foot">' + opts.footer + "</div>";
    }

    overlay.innerHTML =
      '<div class="modal ' + (opts.size || "") + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head">' +
      "<div>" +
      "<h2>" + U.esc(opts.title || "") + "</h2>" +
      (opts.subtitle ? "<p>" + U.esc(opts.subtitle) + "</p>" : "") +
      "</div>" +
      '<button class="btn-icon plain" data-close aria-label="Close">' + icon("x", 18) + "</button>" +
      "</div>" +
      '<div class="modal-body">' + (opts.body || "") + "</div>" +
      footer +
      "</div>";

    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeModal();
    });

    root.appendChild(overlay);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    current = overlay;

    var auto = overlay.querySelector("[data-autofocus]") || overlay.querySelector("input:not([type=hidden]), select, textarea");
    if (auto) setTimeout(function () { auto.focus(); }, 60);

    if (opts.onMount) opts.onMount(overlay);
    return overlay;
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var el = modal({
        title: opts.title || "Are you sure?",
        subtitle: opts.subtitle || "",
        size: "slim",
        body: '<p style="font-size:13.5px;color:var(--text-2);line-height:1.6">' + (opts.message || "") + "</p>" +
          (opts.extra ? opts.extra : ""),
        footer: '<button class="btn" data-cancel>' + U.esc(opts.cancelText || "Cancel") + "</button>" +
          '<button class="btn ' + (opts.danger ? "btn-danger-solid" : "btn-primary") + '" data-ok>' +
          U.esc(opts.confirmText || "Confirm") + "</button>",
        onMount: function (overlay) {
          overlay.querySelector("[data-cancel]").addEventListener("click", function () {
            closeModal();
            resolve(false);
          });
          overlay.querySelector("[data-ok]").addEventListener("click", function () {
            closeModal();
            resolve(true);
          });
        },
      });
      el.addEventListener("click", function (e) {
        if (e.target === el) resolve(false);
      });
    });
  }

  /* ---------------- mobile sheet ---------------- */

  function sheet(html) {
    closeSheet();
    var root = document.getElementById("sheet-root");
    var overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    var panel = document.createElement("div");
    panel.className = "sheet";
    panel.innerHTML = html;
    root.appendChild(overlay);
    root.appendChild(panel);

    overlay.addEventListener("click", closeSheet);
    return panel;
  }

  function closeSheet() {
    var root = document.getElementById("sheet-root");
    if (root) root.innerHTML = "";
  }

  /* ---------------- print ---------------- */

  function printHTML(html) {
    var frame = document.getElementById("print-frame");
    if (!frame) return;
    frame.onload = function () {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) {
        console.warn("Print failed", e);
      }
    };
    frame.srcdoc = html;
  }

  function receiptBody(bill) {
    var shop = global.POS.store.db.shop;
    var methodText = bill.method === "Bank" ? "Bank transfer"
      : bill.method === "Cheque" ? "Bank cheque"
        : (bill.method || "Cash");
    var lines = (bill.lines || []).map(function (l) {
      return "<tr><td>" + U.esc(l.name) +
        '<div class="r-small">' + U.num(l.qty) + " x " + U.money(l.price) + "</div></td>" +
        '<td class="n">' + U.money(l.price * l.qty) + "</td></tr>";
    }).join("");

    var body =
      '<div class="r-center"><div class="r-title">' + U.esc((shop.legalName || shop.name).toUpperCase()) + "</div>" +
      '<div class="r-small">' + U.esc(shop.address || "") + "</div>" +
      '<div class="r-small">' + (shop.phone ? "Tel: " + U.esc(shop.phone) : "") + "</div>" +
      (shop.email ? '<div class="r-small">' + U.esc(shop.email) + "</div>" : "") + "</div>" +
      '<div class="r-rule"></div>' +
      '<div class="r-row"><span>Bill</span><span>' + U.esc(bill.no) + "</span></div>" +
      '<div class="r-row"><span>Date</span><span>' + U.dateTime(bill.ts) + "</span></div>" +
      '<div class="r-row"><span>Cashier</span><span>' + U.esc(bill.cashier || "") + "</span></div>" +
      '<div class="r-row"><span>Customer</span><span>' + U.esc(bill.customerName) + "</span></div>" +
      '<div class="r-rule"></div>' +
      "<table><thead><tr><th>Item</th><th class='n'>Amount</th></tr></thead><tbody>" + lines + "</tbody></table>" +
      '<div class="r-rule"></div>' +
      '<div class="r-row"><span>Subtotal</span><span>' + U.money(bill.subtotal) + "</span></div>" +
      (bill.discount ? '<div class="r-row"><span>Discount</span><span>-' + U.money(bill.discount) + "</span></div>" : "") +
      '<div class="r-row total"><span>TOTAL</span><span>' + U.money(bill.total) + "</span></div>" +
      '<div class="r-row"><span>Paid (' + U.esc(methodText) + ")</span><span>" + U.money(bill.paid) + "</span></div>" +
      (bill.bankName ? '<div class="r-row"><span>Bank</span><span>' + U.esc(bill.bankName) + "</span></div>" : "") +
      (bill.chequeNo ? '<div class="r-row"><span>Cheque no</span><span>' + U.esc(bill.chequeNo) + "</span></div>" : "") +
      (bill.balance > 0
        ? '<div class="r-row"><span>Balance due</span><span>' + U.money(bill.balance) + "</span></div>"
        : '<div class="r-row"><span>Change</span><span>' + U.money(Math.max(0, bill.paid - bill.total)) + "</span></div>") +
      '<div class="r-rule"></div>' +
      '<div class="r-center r-small">Thank you for shopping with us!</div>' +
      '<div class="r-center r-small" style="margin-top:6px">Powered by ' + U.esc(shop.name) + " POS</div>";

    return body;
  }

  function receiptHTML(bill) {
    return "<!doctype html><html><head><meta charset='utf-8'><title>" + U.esc(bill.no) + "</title><style>" +
      "@page{size:80mm auto;margin:4mm}" +
      "*{box-sizing:border-box}" +
      "body{font-family:'SF Mono',Consolas,monospace;font-size:11.5px;color:#000;margin:0;padding:0;width:72mm}" +
      ".r-center{text-align:center}.r-title{font-weight:800;font-size:15px;letter-spacing:.08em}" +
      ".r-small{font-size:9.5px;color:#333}.r-rule{border-top:1px dashed #999;margin:6px 0}" +
      ".r-row{display:flex;justify-content:space-between;gap:8px;padding:1px 0}" +
      ".r-row.total{font-weight:800;font-size:13px;border-top:1px solid #000;border-bottom:1px solid #000;padding:4px 0;margin:4px 0}" +
      "table{width:100%;border-collapse:collapse}th{text-align:left;font-size:9.5px;border-bottom:1px dashed #bbb;padding:2px 0}" +
      "td{padding:2px 0;vertical-align:top}td.n,th.n{text-align:right;white-space:nowrap}" +
      "</style></head><body>" + receiptBody(bill) + "</body></html>";
  }

  /* ---------- dot matrix bill (monochrome, monospaced) ---------- */

  function billPaperSize(shop) {
    var paper = shop.billPaper || "9.5x5.5";
    if (paper === "a4") return "A4";
    if (paper === "9.5x11") return "241mm 279mm";
    return "241mm 140mm";
  }

  function dotReceiptBody(bill) {
    var shop = global.POS.store.db.shop;
    var methodText = bill.method === "Bank" ? "Bank transfer"
      : bill.method === "Cheque" ? "Bank cheque"
        : (bill.method || "Cash");
    var lines = (bill.lines || []).map(function (l) {
      return "<tr><td class='item'>" + U.esc(l.name) + "</td>" +
        "<td class='r qty'>" + U.num(l.qty) + "</td>" +
        "<td class='r rate'>" + U.money(l.price) + "</td>" +
        "<td class='r amt'>" + U.money(l.price * l.qty) + "</td></tr>";
    }).join("");

    return '<div class="c name">' + U.esc((shop.legalName || shop.name).toUpperCase()) + "</div>" +
      '<div class="c small">' + U.esc(shop.address || "") + "</div>" +
      '<div class="c small">' + (shop.phone ? "Tel: " + U.esc(shop.phone) : "") + "</div>" +
      (shop.email ? '<div class="c small">' + U.esc(shop.email) + "</div>" : "") +
      '<div class="rule"></div>' +
      '<table class="meta"><tbody>' +
      '<tr><td>Bill: ' + U.esc(bill.no) + '</td><td class="r">' + U.dateTime(bill.ts) + "</td></tr>" +
      '<tr><td>Customer: ' + U.esc(bill.customerName) + '</td><td class="r">Cashier: ' + U.esc(bill.cashier || "") + "</td></tr>" +
      "</tbody></table>" +
      '<div class="rule"></div>' +
      '<table class="items"><thead><tr><th class="item">ITEM</th><th class="r qty">QTY</th><th class="r rate">RATE</th><th class="r amt">AMOUNT</th></tr></thead>' +
      "<tbody>" + lines + "</tbody></table>" +
      '<div class="rule"></div>' +
      '<table class="totals"><tbody>' +
      '<tr><td>Subtotal</td><td class="r">' + U.money(bill.subtotal) + "</td></tr>" +
      (bill.discount ? '<tr><td>Discount</td><td class="r">-' + U.money(bill.discount) + "</td></tr>" : "") +
      '<tr class="total"><td>TOTAL</td><td class="r">' + U.money(bill.total) + "</td></tr>" +
      '<tr><td>Paid (' + U.esc(methodText) + ")</td><td class=\"r\">" + U.money(bill.paid) + "</td></tr>" +
      (bill.bankName ? '<tr><td>Bank</td><td class="r">' + U.esc(bill.bankName) + "</td></tr>" : "") +
      (bill.chequeNo ? '<tr><td>Cheque no</td><td class="r">' + U.esc(bill.chequeNo) + "</td></tr>" : "") +
      (bill.balance > 0
        ? '<tr><td>Balance due</td><td class="r">' + U.money(bill.balance) + "</td></tr>"
        : '<tr><td>Change</td><td class="r">' + U.money(Math.max(0, bill.paid - bill.total)) + "</td></tr>") +
      "</tbody></table>" +
      '<div class="rule"></div>' +
      '<div class="c small foot">Thank you for shopping with us!</div>' +
      '<div class="c small">Powered by Austerra Agri Solutions POS</div>';
  }

  function dotReceiptHTML(bill) {
    var shop = global.POS.store.db.shop;
    var size = billPaperSize(shop);
    return "<!doctype html><html><head><meta charset='utf-8'><title>" + U.esc(bill.no) + "</title><style>" +
      "@page{size:" + size + ";margin:5mm 6mm}" +
      "*{box-sizing:border-box}" +
      "html,body{margin:0;padding:0}" +
      "body{font-family:'Courier New',Courier,monospace;font-size:11pt;line-height:1.28;color:#000;background:#fff}" +
      ".c{text-align:center}.name{font-size:13pt;font-weight:bold;letter-spacing:.02em}" +
      ".small{font-size:9.5pt}.foot{margin-top:5px}" +
      ".rule{border-top:1px dashed #000;margin:4px 0}" +
      "table{width:100%;border-collapse:collapse}" +
      ".meta td{padding:0;vertical-align:top}" +
      ".items th{text-align:left;border-bottom:1px solid #000;padding:2px 0;font-size:10pt;font-weight:bold}" +
      ".items td{padding:2px 0;vertical-align:top}" +
      ".items .item{width:46%}.items .qty{width:10%}.items .rate{width:20%}.items .amt{width:24%}" +
      ".r{text-align:right;white-space:nowrap}" +
      ".totals td{padding:1px 0}" +
      ".totals .total td{border-top:1px solid #000;border-bottom:1px solid #000;font-weight:bold;font-size:12pt;padding:3px 0}" +
      "</style></head><body>" + dotReceiptBody(bill) + "</body></html>";
  }

  function printReceipt(bill) {
    var shop = global.POS.store.db.shop;
    if ((shop.billPrinter || "dot") === "thermal") printHTML(receiptHTML(bill));
    else printHTML(dotReceiptHTML(bill));
  }

  /* ---------------- misc ---------------- */

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 400);
  }

  /* ---------------- receipt image & pdf download (no libraries needed) ---------------- */

  var BILL_PAGE_W = 794; /* px @96dpi = A4 width */
  var PT_W = 595.28;     /* PDF page width, pt */
  var PT_H = 841.89;     /* PDF page height, pt */

  function billFileName(bill, ext) {
    var base = "bill-" + bill.no + "-" + U.dateShort(bill.ts);
    return base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+$/, "-") + ext;
  }

  /* Render the invoice into an iframe, measure it and return a
     self-contained SVG we can paint onto a canvas.
     Layout = the printed dot-matrix bill, so the file matches the paper bill. */
  function rasterBillSvg(bill) {
    return new Promise(function (resolve, reject) {
      var iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText = "position:absolute;left:-10000px;top:0;width:" + BILL_PAGE_W + "px;height:800px;border:0;";
      document.body.appendChild(iframe);
      var idoc = iframe.contentDocument;
      idoc.open();
      idoc.write(dotReceiptHTML(bill));
      idoc.close();
      setTimeout(function () {
        try {
          var doc = iframe.contentDocument;
          var H = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight) + 8;
          var wrap = doc.createElement("div");
          var st = doc.createElement("style");
          var styles = doc.querySelectorAll("head style");
          for (var i = 0; i < styles.length; i++) st.textContent += styles[i].textContent;
          wrap.appendChild(st);
          while (doc.body.firstChild) wrap.appendChild(doc.body.firstChild);
          wrap.style.margin = "0";
          wrap.style.width = BILL_PAGE_W + "px";
          wrap.style.boxSizing = "border-box";
          wrap.style.background = "#ffffff";
          wrap.style.padding = "26px 32px";
          wrap.style.fontFamily = "'Courier New', Courier, monospace";
          wrap.style.fontSize = "11pt";
          wrap.style.lineHeight = "1.28";
          wrap.style.color = "#000";
          var svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + BILL_PAGE_W + '" height="' + H + '">' +
            '<foreignObject width="' + BILL_PAGE_W + '" height="' + H + '">' +
            new XMLSerializer().serializeToString(wrap) +
            "</foreignObject></svg>";
          iframe.remove();
          resolve({ svg: svg, width: BILL_PAGE_W, height: H });
        } catch (err) {
          iframe.remove();
          reject(err);
        }
      }, 150);
    });
  }

  /* Paint the rasterized SVG onto a canvas. */
  function svgToCanvas(r) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement("canvas");
        cv.width = r.width;
        cv.height = r.height;
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv);
      };
      img.onerror = function (e) { reject(new Error("Bill layout could not be rasterized.")); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(r.svg);
    });
  }

  function dataUrlBytes(dataUrl) {
    var bin = atob(String(dataUrl).split(",")[1]);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function dataUrlBlob(dataUrl, mime) {
    return new Blob([dataUrlBytes(dataUrl)], { type: mime });
  }

  function dataUrlMime(dataUrl) {
    return (/:(.*?);/.exec(String(dataUrl).split(",")[0]) || [])[1] || "application/octet-stream";
  }

  function saveBlob(name, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 600);
  }

  /* Build a valid PDF with each canvas slice as one A4 page (JPEG/DCTDecode). */
  function pdfFromJpegs(jpegs) {
    var chunks = [];
    var len = 0;
    var offsets = [];

    function wstr(s) {
      var b = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
      chunks.push(b);
      len += b.length;
    }
    function wbytes(b) { chunks.push(b); len += b.length; }
    function objStart() { offsets.push(len); }

    var kids = [];
    var i;
    for (i = 0; i < jpegs.length; i++) kids.push((5 + i * 3) + " 0 R");

    wstr("%PDF-1.4\n");

    objStart();
    wstr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    objStart();
    wstr("2 0 obj\n<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + jpegs.length + " >>\nendobj\n");

    for (i = 0; i < jpegs.length; i++) {
      var imgNo = 3 + i * 3;
      var cntNo = 4 + i * 3;
      var pageNo = 5 + i * 3;
      var img = jpegs[i];
      var cs = "q " + PT_W + " 0 0 " + PT_H + " 0 0 cm /Im0 Do Q";

      objStart();
      wstr(imgNo + " 0 obj\n<< /Type /XObject /Subtype /Image /Width " + img.w +
        " /Height " + img.h + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
        img.bytes.length + " >>\nstream\n");
      wbytes(img.bytes);
      wstr("\nendstream\nendobj\n");

      objStart();
      wstr(cntNo + " 0 obj\n<< /Length " + cs.length + " >>\nstream\n" + cs + "\nendstream\nendobj\n");

      objStart();
      wstr(pageNo + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PT_W + " " + PT_H +
        "] /Resources << /XObject << /Im0 " + imgNo + " 0 R >> >> /Contents " + cntNo + " 0 R >>\nendobj\n");
    }

    var xrefPos = len;
    var count = offsets.length;
    wstr("xref\n0 " + (count + 1) + "\n0000000000 65535 f \n");
    for (i = 0; i < count; i++) {
      wstr(("0000000000" + offsets[i]).slice(-10) + " 00000 n \n");
    }
    wstr("trailer\n<< /Size " + (count + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF");
    return new Blob(chunks, { type: "application/pdf" });
  }

  function downloadBillImage(bill) {
    rasterBillSvg(bill)
      .then(svgToCanvas)
      .then(function (cv) {
        var url = cv.toDataURL("image/png");
        saveBlob(billFileName(bill, ".png"), dataUrlBlob(url, dataUrlMime(url)));
        toast("Bill saved as image: " + billFileName(bill, ".png"), "ok");
      })
      .catch(function (e) {
        console.error(e);
        toast("Image generation failed: " + e.message, "err");
      });
  }

  function downloadBillPDF(bill) {
    rasterBillSvg(bill)
      .then(svgToCanvas)
      .then(function (cv) {
        /* slice the long bill into A4-shaped pages */
        var pagePxH = Math.round(cv.width * PT_H / PT_W);
        var pages = Math.max(1, Math.ceil(cv.height / pagePxH));
        var jpegs = [];
        for (var p = 0; p < pages; p++) {
          var slice = document.createElement("canvas");
          slice.width = cv.width;
          slice.height = pagePxH;
          var sctx = slice.getContext("2d");
          sctx.fillStyle = "#ffffff";
          sctx.fillRect(0, 0, slice.width, slice.height);
          var y = p * pagePxH;
          var h = Math.min(pagePxH, cv.height - y);
          sctx.drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h);
          jpegs.push({ bytes: dataUrlBytes(slice.toDataURL("image/jpeg", 0.92)), w: cv.width, h: pagePxH });
        }
        saveBlob(billFileName(bill, ".pdf"), pdfFromJpegs(jpegs));
        toast("Bill saved as PDF: " + billFileName(bill, ".pdf"), "ok");
      })
      .catch(function (e) {
        console.error(e);
        toast("PDF generation failed: " + e.message, "err");
      });
  }

  /* Download entry point: asks the user which file type they want. */
  function downloadReceipt(bill) {
    modal({
      title: "Download bill " + U.esc(bill.no),
      subtitle: "Choose the file type",
      body:
        '<button type="button" class="dl-opt" id="dl-image">' +
        '<span class="dl-ico">' + icon("image", 22) + "</span>" +
        '<span class="dl-txt"><strong>Image (PNG)</strong><span class="small muted">Full bill as one picture</span></span>' +
        '<span class="dl-arrow">' + icon("arrowRight", 18) + "</span></button>" +
        '<button type="button" class="dl-opt" id="dl-pdf">' +
        '<span class="dl-ico">' + icon("pdf", 22) + "</span>" +
        '<span class="dl-txt"><strong>PDF document</strong><span class="small muted">A4 pages, ready to print or share</span></span>' +
        '<span class="dl-arrow">' + icon("arrowRight", 18) + "</span></button>" +
        '<div class="small muted" style="margin-top:10px">Files are also listed in your browser downloads.</div>',
      footer: '<button class="btn" data-close>Cancel</button>',
      onMount: function (overlay) {
        overlay.querySelector("#dl-image").addEventListener("click", function () {
          closeModal();
          downloadBillImage(bill);
        });
        overlay.querySelector("#dl-pdf").addEventListener("click", function () {
          closeModal();
          downloadBillPDF(bill);
        });
      },
    });
  }


  /* Full document version of the receipt, with a shop header,
     a customer block (including the saved customer note),
     a complete items table and a totals block. */
  function receiptFileHTML(bill) {
    var shop = global.POS.store.db.shop;
    var methodText = bill.method === "Bank" ? "Bank transfer"
      : bill.method === "Cheque" ? "Bank cheque"
        : (bill.method || "Cash");
    var rows = (bill.lines || []).map(function (l, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + U.esc(l.name) + "</td>" +
        '<td class="n">' + U.num(l.qty) + " " + U.esc(l.unit || "pcs") + '</td><td class="n">' +
        U.money(l.price) + '</td><td class="n">' + U.money(l.price * l.qty) + "</td></tr>";
    }).join("");

    var note = bill.customerNote ? '<div class="note-line"><strong>Customer note:</strong> ' + U.esc(bill.customerNote) + "</div>" : "";

    return "<!doctype html><html><head><meta charset='utf-8'><title>" + U.esc(bill.no) + "</title><style>" +
      "body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:32px 36px;font-size:13px;line-height:1.5}" +
      ".hdr{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:14px;text-align:center}" +
      ".hdr h1{margin:0;font-size:22px;letter-spacing:.02em}" +
      ".hdr .small{color:#444;font-size:12px}" +
      ".meta{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}" +
      ".meta div{flex:1;min-width:200px}" +
      ".meta .lab{font-size:10px;text-transform:uppercase;color:#777;letter-spacing:.08em}" +
      "table{width:100%;border-collapse:collapse;margin:8px 0 14px}" +
      "th,td{border:1px solid #ccc;padding:7px 9px;text-align:left}" +
      "th{background:#f2f2f2;font-size:11px;text-transform:uppercase;letter-spacing:.04em}" +
      ".n{text-align:right;white-space:nowrap}" +
      ".tot{width:320px;margin-left:auto}" +
      ".tot td{border:none;border-bottom:1px dotted #bbb;padding:4px 0}" +
      ".tot .grand{font-weight:bold;font-size:15px;border-top:2px solid #111;border-bottom:2px solid #111}" +
      ".note-line{background:#fff7e6;border-left:3px solid #d9a400;padding:8px 10px;margin:0 0 14px}" +
      ".foot{margin-top:20px;color:#666;text-align:center;font-size:11px}" +
      "@media print{body{padding:0}}" +
      "</style></head><body>" +
      '<div class="hdr"><h1>' + U.esc((shop.legalName || shop.name).toUpperCase()) + "</h1>" +
      '<div class="small">' + U.esc(shop.address || "") + "</div>" +
      '<div class="small">' + (shop.phone ? "Tel: " + U.esc(shop.phone) : "") + (shop.email ? " · " + U.esc(shop.email) : "") + "</div>" +
      "</div>" +
      '<div class="meta">' +
      '<div><div class="lab">Bill number</div><strong>' + U.esc(bill.no) + "</strong></div>" +
      '<div><div class="lab">Date &amp; time</div>' + U.dateTime(bill.ts) + "</div>" +
      '<div><div class="lab">Cashier</div>' + U.esc(bill.cashier || "") + "</div>" +
      '<div><div class="lab">Payment</div>' + U.esc(methodText) + "</div>" +
      "</div>" +
      '<div class="meta">' +
      '<div><div class="lab">Billed to</div><strong>' + U.esc(bill.customerName) + "</strong>" +
      (bill.customerAddress ? "<div>" + U.esc(bill.customerAddress) + "</div>" : "") + "</div>" +
      "</div>" +
      note +
      "<table><thead><tr><th>#</th><th>Item</th><th class='n'>Qty</th><th class='n'>Price</th><th class='n'>Amount</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table>" +
      '<table class="tot"><tbody>' +
      "<tr><td>Subtotal</td><td class='n'>" + U.money(bill.subtotal) + "</td></tr>" +
      (bill.discount ? "<tr><td>Discount</td><td class='n'>-" + U.money(bill.discount) + "</td></tr>" : "") +
      "<tr class='grand'><td>TOTAL</td><td class='n'>" + U.money(bill.total) + "</td></tr>" +
      "<tr><td>Paid</td><td class='n'>" + U.money(bill.paid) + "</td></tr>" +
      (bill.balance > 0
        ? "<tr><td>Balance due</td><td class='n'>" + U.money(bill.balance) + "</td></tr>"
        : "<tr><td>Change</td><td class='n'>" + U.money(Math.max(0, bill.paid - bill.total)) + "</td></tr>") +
      "</tbody></table>" +
      '<div class="foot">Thank you for shopping with us!<br>Powered by ' + U.esc(shop.name) + " POS</div>" +
      "</body></html>";
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 180);
    };
  }

  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "?";
  }

  global.POS.ui = {
    icon: icon,
    toast: toast,
    modal: modal,
    closeModal: closeModal,
    confirm: confirmDialog,
    sheet: sheet,
    closeSheet: closeSheet,
    printHTML: printHTML,
    receiptHTML: receiptHTML,
    dotReceiptHTML: dotReceiptHTML,
    receiptBody: receiptBody,
    dotReceiptBody: dotReceiptBody,
    printReceipt: printReceipt,
    download: download,
    downloadReceipt: downloadReceipt,
    receiptFileHTML: receiptFileHTML,
    debounce: debounce,
    initials: initials,
  };
})(window);
