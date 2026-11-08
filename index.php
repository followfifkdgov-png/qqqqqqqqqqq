<?php
/* ============================================================
   Austerra Agri Solutions POS - application shell
   Redirects to the installer on first run.
   ============================================================ */

$envConfigured = getenv('DB_HOST') && getenv('DB_NAME') && getenv('DB_USER');
$installed = $envConfigured || (is_file(__DIR__ . '/storage/installed.lock') && is_file(__DIR__ . '/config.php'));
if ($envConfigured) {
    // Serverless (Vercel): config comes from env vars and the installer cannot write files.
} elseif ($installed && is_file(__DIR__ . '/install.php')) {
    try {
        require_once __DIR__ . '/lib/app.php';
        db();
    } catch (Throwable $e) {
        // Database unreachable with current config (e.g. newly uploaded to InfinityFree)
        header('Location: install.php');
        exit;
    }
} elseif (!$installed) {
    if (is_file(__DIR__ . '/install.php')) {
        header('Location: install.php');
        exit;
    }
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: SAMEORIGIN');

$v = '2.4.0';
?>
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0a0c0b" />
  <meta name="description" content="Austerra Agri Solutions POS — fast billing, live stock, customers and daily profit. Your data is stored securely on your shop server." />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Austerra POS" />
  <title>Austerra Agri Solutions POS</title>
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="icon" href="assets/img/austerra-icon.png" type="image/png" />
  <link rel="apple-touch-icon" href="assets/img/austerra-icon.png" />
  <link rel="stylesheet" href="assets/css/styles.css?v=<?= $v ?>" />
</head>
<body>
  <div id="app" class="app-root">
    <div style="min-height:100vh;display:grid;place-items:center;gap:14px;text-align:center;padding:24px">
      <div style="width:46px;height:46px;border-radius:14px;border:3px solid rgba(123,207,157,.25);border-top-color:#7bcf9d;animation:posspin 0.9s linear infinite"></div>
      <div style="color:#8fa096;font:500 14px system-ui,sans-serif">Opening your counter…</div>
    </div>
  </div>

  <div id="modal-root"></div>
  <div id="toast-root" class="toast-root" role="status" aria-live="polite"></div>

  <div id="sheet-root"></div>

  <iframe id="print-frame" title="Print" style="position:fixed;width:0;height:0;border:0;left:-9999px;top:0"></iframe>

  <style>@keyframes posspin{to{transform:rotate(360deg)}}</style>

  <script src="assets/js/store.js?v=<?= $v ?>"></script>
  <script src="assets/js/ui.js?v=<?= $v ?>"></script>
  <script src="assets/js/views.js?v=<?= $v ?>"></script>
  <script src="assets/js/app.js?v=<?= $v ?>"></script>
</body>
</html>
