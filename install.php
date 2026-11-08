<?php
/* ============================================================
   Austerra Agri Solutions POS - one-time installer
   Creates the MySQL tables, the admin login and config.php.
   DELETE THIS FILE (or leave the lock in place) after install.
   ============================================================ */

define('APP_ROOT', __DIR__);
$configFile = APP_ROOT . '/config.php';
$lockFile = APP_ROOT . '/storage/installed.lock';
$schemaFile = APP_ROOT . '/sql/schema.sql';

error_reporting(E_ALL);
ini_set('display_errors', '1');

session_name('austerra_install');
session_start();
if (empty($_SESSION['install_csrf'])) {
    $_SESSION['install_csrf'] = bin2hex(random_bytes(24));
}

function h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function post($key, $default = '')
{
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : $default;
}

$installed = is_file($lockFile) && is_file($configFile);
if ($installed) {
    try {
        require_once APP_ROOT . '/lib/app.php';
        db();
    } catch (Throwable $e) {
        // Database connection failed with current config (e.g. moved from local to InfinityFree).
        // Allow the installer to run so the user can easily enter the correct database details.
        $installed = false;
        $connectionNotice = $e->getMessage();
    }
}
$errors = array();
$success = false;
$manualConfig = null;

$defaults = array(
    'db_host' => 'localhost',
    'db_port' => '',
    'db_name' => '',
    'db_user' => '',
    'db_pass' => '',
    'admin_user' => 'admin',
    'admin_pass' => '',
    'admin_pass2' => '',
    'shop_name' => 'AUSTERRA AGRI SOLUTIONS',
    'timezone' => 'Asia/Colombo',
);

/* Requirements ---------------------------------------------------- */
$checks = array(
    'PHP 7.4 or newer'          => version_compare(PHP_VERSION, '7.4.0', '>='),
    'PDO MySQL extension'       => extension_loaded('pdo_mysql'),
    'OpenSSL (secure random)'   => extension_loaded('openssl'),
    'mbstring (recommended)'    => extension_loaded('mbstring'),
    'storage/ is writable'      => is_dir(APP_ROOT . '/storage') && is_writable(APP_ROOT . '/storage'),
    'sql/schema.sql found'      => is_file($schemaFile),
);
$requirementsOk = true;
foreach ($checks as $ok) {
    if (!$ok) {
        $requirementsOk = false;
    }
}

if (!$installed && $requirementsOk && ($_SERVER['REQUEST_METHOD'] === 'POST') && isset($_POST['install'])) {
    if (!isset($_POST['_csrf']) || !hash_equals($_SESSION['install_csrf'], (string) $_POST['_csrf'])) {
        $errors[] = 'Security token expired. Please reload the page and try again.';
    }

    $dbHost = post('db_host', 'localhost');
    $dbPort = post('db_port');
    $dbName = post('db_name');
    $dbUser = post('db_user');
    $dbPass = isset($_POST['db_pass']) ? (string) $_POST['db_pass'] : '';
    $adminUser = post('admin_user', 'admin');
    $adminPass = isset($_POST['admin_pass']) ? (string) $_POST['admin_pass'] : '';
    $adminPass2 = isset($_POST['admin_pass2']) ? (string) $_POST['admin_pass2'] : '';
    $shopName = post('shop_name', 'AUSTERRA AGRI SOLUTIONS');
    $timezone = post('timezone', 'Asia/Colombo');

    if ($dbHost === '' || $dbName === '' || $dbUser === '') {
        $errors[] = 'Database host, name and user are required.';
    }
    if (!preg_match('/^[A-Za-z0-9_\-]{1,64}$/', $adminUser)) {
        $errors[] = 'Username can only use letters, numbers, underscore and dash.';
    }
    if (strlen($adminPass) < 6) {
        $errors[] = 'Admin password must be at least 6 characters.';
    }
    if (strlen($adminPass) > 72) {
        $errors[] = 'Admin password is too long (maximum 72 characters).';
    }
    if ($adminPass !== $adminPass2) {
        $errors[] = 'The two admin passwords do not match.';
    }

    if (!in_array($timezone, timezone_identifiers_list(), true)) {
        $timezone = 'Asia/Colombo';
    }

    if (!$errors) {
        try {
            $dsn = 'mysql:host=' . $dbHost . ';dbname=' . $dbName . ';charset=utf8mb4';
            if ($dbPort !== '' && ctype_digit($dbPort)) {
                $dsn = 'mysql:host=' . $dbHost . ';port=' . (int) $dbPort . ';dbname=' . $dbName . ';charset=utf8mb4';
            }
            $pdo = new PDO($dsn, $dbUser, $dbPass, array(
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ));
            try {
                $pdo->exec("SET time_zone = '+05:30'");
            } catch (Throwable $e) {
                // Ignore time zone failure on restrictive hosting like InfinityFree
            }

            // Run the schema (statement by statement; DDL cannot be rolled back).
            $sql = file_get_contents($schemaFile);
            if ($sql === false) {
                throw new RuntimeException('Could not read sql/schema.sql');
            }
            $sql = preg_replace('/^\s*--.*$/m', '', $sql);
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            foreach ($statements as $statement) {
                if ($statement === '') {
                    continue;
                }
                // Skip CREATE DATABASE or USE statements when installing into chosen DB
                if (preg_match('/^(CREATE\s+DATABASE|USE\s+)/i', $statement)) {
                    continue;
                }
                $pdo->exec($statement);
            }

            // Admin user: only create if the table is empty.
            $userCount = (int) $pdo->query('SELECT COUNT(*) AS n FROM users')->fetch()['n'];
            if ($userCount === 0) {
                $now = (int) round(microtime(true) * 1000);
                $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role, must_change, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)');
                $stmt->execute(array($adminUser, password_hash($adminPass, PASSWORD_DEFAULT), 'admin', $now, $now));
            }

            $now = (int) round(microtime(true) * 1000);
            $shopName = ($shopName !== '') ? $shopName : 'AUSTERRA AGRI SOLUTIONS';
            $stmt = $pdo->prepare('INSERT INTO shop (id, name, legal_name, tagline, address, phone, email, currency, target, bill_printer, bill_paper, report_paper, updated_at)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = VALUES(updated_at)');
            $stmt->execute(array(
                $shopName,
                $shopName . ' (PVT) LTD',
                'Agri Solutions',
                '176/4, Kaluwagaha Addara Waththa, Godakanda, Galle, Sri Lanka',
                '+94 77 303 5055',
                'austerraagrisolutions@gmail.com',
                'Rs.',
                10000,
                'dot',
                '9.5x5.5',
                '9.5x11',
                $now,
            ));

            $stmt = $pdo->prepare('INSERT INTO app_state (id, seq, counter, day_open, day_opened_at, day_closed_at, prefs, updated_at)
                VALUES (1, 1001, ?, 1, ?, NULL, ?, ?)
                ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)');
            $stmt->execute(array('01', $now, json_encode(array('theme' => 'dark')), $now));

            $config = array(
                'db' => array(
                    'host' => $dbHost,
                    'port' => ($dbPort !== '' && ctype_digit($dbPort)) ? (int) $dbPort : null,
                    'name' => $dbName,
                    'user' => $dbUser,
                    'pass' => $dbPass,
                ),
                'app' => array(
                    'timezone'     => $timezone,
                    'db_timezone'  => '+05:30',
                    'session_name' => 'austerra_pos_sid',
                    'name'         => 'Austerra Agri Solutions POS',
                ),
            );

            $php = "<?php\n"
                . "/* Austerra Agri Solutions POS - generated by install.php on " . date('Y-m-d H:i:s') . ".\n"
                . "   Keep this file private. It contains your database password. */\n\n"
                . "return " . var_export($config, true) . ";\n";

            if (@file_put_contents($configFile, $php) === false) {
                $manualConfig = $php;
                $errors[] = 'The database is ready, but config.php could not be written. Create config.php manually using the code shown below.';
            } else {
                @chmod($configFile, 0640);
                @file_put_contents($lockFile, 'installed ' . date('c') . PHP_EOL);
                $success = true;
            }
        } catch (PDOException $e) {
            $errors[] = 'Database connection or setup failed: ' . $e->getMessage();
        } catch (Throwable $e) {
            $errors[] = 'Install failed: ' . $e->getMessage();
        }
    }

    $defaults['db_host'] = $dbHost;
    $defaults['db_port'] = $dbPort;
    $defaults['db_name'] = $dbName;
    $defaults['db_user'] = $dbUser;
    $defaults['admin_user'] = $adminUser;
    $defaults['shop_name'] = $shopName;
    $defaults['timezone'] = $timezone;
}

if ($installed && !$success) {
    $success = false;
}

/* Finish after a manual config.php upload (when the folder is not writable). */
if (!$installed && $requirementsOk && ($_SERVER['REQUEST_METHOD'] === 'POST') && isset($_POST['finish'])) {
    if (!isset($_POST['_csrf']) || !hash_equals($_SESSION['install_csrf'], (string) $_POST['_csrf'])) {
        $errors[] = 'Security token expired. Please reload the page and try again.';
    } elseif (!is_file($configFile)) {
        $errors[] = 'config.php was not found yet. Upload it to the app folder, then try again.';
    } else {
        try {
            $test = include $configFile;
        } catch (Throwable $e) {
            $test = null;
        }
        if (!is_array($test) || empty($test['db']['name']) || empty($test['db']['user'])) {
            $errors[] = 'config.php exists but does not contain valid database settings.';
        } else {
            @file_put_contents($lockFile, 'installed ' . date('c') . PHP_EOL);
            $success = true;
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Install · Austerra POS</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:#0a0c0b; color:#e8ece9; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 18px 60px; }
  .brand { display:flex; align-items:center; gap:12px; margin-bottom:22px; }
  .brand img { width:46px; height:46px; border-radius:12px; object-fit:cover; }
  .brand strong { display:block; font-size:15px; letter-spacing:.02em; }
  .brand span { color:#8d9a92; font-size:12px; }
  h1 { font-size:26px; margin:0 0 6px; }
  .lead { color:#9aa79e; margin:0 0 22px; font-size:14px; line-height:1.6; }
  .card { background:#111614; border:1px solid #22302a; border-radius:16px; padding:20px; margin-bottom:16px; }
  h2 { font-size:14px; letter-spacing:.08em; text-transform:uppercase; color:#9bb0a4; margin:0 0 14px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .grid .full { grid-column:1 / -1; }
  label { display:block; font-size:12px; color:#a7b6ad; margin-bottom:6px; }
  input { width:100%; padding:11px 12px; border-radius:10px; border:1px solid #2a3a33; background:#0b100e; color:#eef3f0; font-size:14px; }
  input:focus { outline:none; border-color:#7bcf9d; box-shadow:0 0 0 3px rgba(123,207,157,.12); }
  .hint { font-size:11.5px; color:#78877e; margin-top:5px; }
  button { margin-top:18px; width:100%; padding:13px 16px; border:0; border-radius:11px; background:#c9541c; color:#fff; font-weight:700; font-size:15px; cursor:pointer; }
  button:hover { background:#e06427; }
  .check { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px dashed #1e2a24; font-size:13px; }
  .check:last-child { border-bottom:0; }
  .ok { color:#7bcf9d; font-weight:600; }
  .bad { color:#ff8a7a; font-weight:600; }
  .err { background:#2a1411; border:1px solid #6d2c22; color:#ffb7ac; padding:12px 14px; border-radius:10px; font-size:13px; margin-bottom:14px; }
  .good { background:#10241a; border:1px solid #245c3d; color:#bdf3d2; padding:14px; border-radius:10px; font-size:14px; line-height:1.6; }
  code, pre { font-family: ui-monospace, Consolas, monospace; }
  pre { background:#080b0a; border:1px solid #22302a; padding:14px; border-radius:10px; overflow:auto; font-size:12px; }
  a { color:#8ee0ae; }
  .small { font-size:12px; color:#8d9a92; line-height:1.6; }
  .row { display:flex; gap:10px; flex-wrap:wrap; }
  .row a.btn { display:inline-block; margin-top:14px; padding:11px 18px; background:#7bcf9d; color:#08130d; text-decoration:none; border-radius:10px; font-weight:700; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <img src="assets/img/austerra-logo.jpeg" alt="">
    <div><strong>AUSTERRA AGRI SOLUTIONS</strong><span>POS · PHP + MySQL installer</span></div>
  </div>

<?php if ($installed && !$success): ?>
  <h1>Already installed</h1>
  <div class="card">
    <p class="lead" style="margin-bottom:0">This POS is already installed on this server. Open the app and sign in.</p>
    <div class="row">
      <a class="btn" href="./index.php">Open the POS</a>
    </div>
    <p class="small" style="margin-top:18px">To reinstall, remove <code>storage/installed.lock</code> and <code>config.php</code>, then reload this page. <strong>Deleting the lock alone will not delete your data.</strong></p>
  </div>

<?php elseif ($success): ?>
  <h1>Installation complete</h1>
  <div class="card">
    <div class="good">
      <strong>Your database is ready.</strong><br>
      Your shop data, stock, customers, bills and reports are now stored in MySQL on this server.
    </div>
    <div class="row">
      <a class="btn" href="./index.php">Open the POS and sign in</a>
    </div>
    <p class="small" style="margin-top:18px">
      <strong>Important:</strong> delete <code>install.php</code> using DirectAdmin File Manager.
      A lock file has been created so it cannot run again, but deleting the file is safer.
      Also keep a copy of <code>config.php</code> somewhere safe.
    </p>
    <p class="small">
      If you already used the old browser version, sign in here and use
      <strong>Settings → Import</strong> with the JSON backup from the old app to move your existing stock, customers and bills.
    </p>
  </div>

<?php else: ?>
  <h1>Install your POS</h1>
  <p class="lead">This creates the MySQL tables and your admin login. You need the database name, user and password you created in DirectAdmin → MySQL Management.</p>

  <?php foreach ($errors as $e): ?>
    <div class="err"><?= h($e) ?></div>
  <?php endforeach; ?>

  <?php if ($manualConfig): ?>
    <div class="card">
      <h2>Manual config.php</h2>
      <p class="small">Create <code>config.php</code> in the app folder and paste this:</p>
      <pre><?= h($manualConfig) ?></pre>
      <form method="post" style="margin-top:6px">
        <input type="hidden" name="_csrf" value="<?= h($_SESSION['install_csrf']) ?>">
        <input type="hidden" name="finish" value="1">
        <button type="submit">I created config.php — finish installation</button>
      </form>
    </div>
  <?php endif; ?>

  <div class="card">
    <h2>Server requirements</h2>
    <?php foreach ($checks as $label => $ok): ?>
      <div class="check"><span><?= h($label) ?></span><span class="<?= $ok ? 'ok' : 'bad' ?>"><?= $ok ? 'OK' : 'Missing' ?></span></div>
    <?php endforeach; ?>
    <p class="hint">PHP version here: <?= h(PHP_VERSION) ?>. If something is missing, enable it in DirectAdmin → Select PHP Version → Extensions.</p>
  </div>

  <?php if ($requirementsOk): ?>
  <form method="post" autocomplete="off">
    <input type="hidden" name="_csrf" value="<?= h($_SESSION['install_csrf']) ?>">
    <input type="hidden" name="install" value="1">

    <div class="card">
      <h2>Database (from DirectAdmin)</h2>
      <div class="grid">
        <div>
          <label for="db_host">MySQL host</label>
          <input id="db_host" name="db_host" value="<?= h($defaults['db_host']) ?>" required>
          <div class="hint">Usually <code>localhost</code> on DirectAdmin.</div>
        </div>
        <div>
          <label for="db_port">Port (optional)</label>
          <input id="db_port" name="db_port" value="<?= h($defaults['db_port']) ?>" placeholder="3306">
          <div class="hint">Leave empty unless your host gave you a port.</div>
        </div>
        <div>
          <label for="db_name">Database name</label>
          <input id="db_name" name="db_name" value="<?= h($defaults['db_name']) ?>" placeholder="user_austerra" required>
        </div>
        <div>
          <label for="db_user">Database user</label>
          <input id="db_user" name="db_user" value="<?= h($defaults['db_user']) ?>" placeholder="user_austerra" required>
        </div>
        <div class="full">
          <label for="db_pass">Database password</label>
          <input id="db_pass" name="db_pass" type="password" value="">
          <div class="hint">The password of the MySQL user, not your hosting password.</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Your login</h2>
      <div class="grid">
        <div>
          <label for="admin_user">Username</label>
          <input id="admin_user" name="admin_user" value="<?= h($defaults['admin_user']) ?>" required>
        </div>
        <div>
          <label for="timezone">Timezone</label>
          <input id="timezone" name="timezone" value="<?= h($defaults['timezone']) ?>">
          <div class="hint">Sri Lanka: <code>Asia/Colombo</code></div>
        </div>
        <div>
          <label for="admin_pass">Password</label>
          <input id="admin_pass" name="admin_pass" type="password" minlength="6" required>
        </div>
        <div>
          <label for="admin_pass2">Confirm password</label>
          <input id="admin_pass2" name="admin_pass2" type="password" minlength="6" required>
        </div>
        <div class="full">
          <label for="shop_name">Shop name</label>
          <input id="shop_name" name="shop_name" value="<?= h($defaults['shop_name']) ?>">
          <div class="hint">You can change this later in Settings → Shop profile.</div>
        </div>
      </div>
    </div>

    <button type="submit">Install now</button>
    <p class="small" style="margin-top:14px">
      This installer only creates tables and one admin user. It never deletes an existing users table.
      If the database already has an admin account, use that account after installing.
    </p>
  </form>
  <?php endif; ?>
<?php endif; ?>

  <p class="small" style="margin-top:26px">Austerra Agri Solutions POS · PHP + MySQL · <?= h(app_version_install()) ?></p>
</div>
<?php
function app_version_install()
{
    return 'v2.0';
}
?>
</body>
</html>
