<?php
/* ============================================================
   Austerra Agri Solutions POS - core helpers
   Config loading, database connection, JSON input/output.
   ============================================================ */

if (!defined('APP_ROOT')) {
    define('APP_ROOT', dirname(__DIR__));
}

class ApiException extends Exception
{
    public $status;

    public function __construct($message, $status = 400)
    {
        parent::__construct($message);
        $this->status = (int) $status;
    }
}

$GLOBALS['APP_CONFIG'] = null;

function app_config()
{
    if ($GLOBALS['APP_CONFIG'] !== null) {
        return $GLOBALS['APP_CONFIG'];
    }

    $file = APP_ROOT . '/config.php';
    if (!is_file($file)) {
        throw new ApiException('The application is not installed yet. Open install.php in your browser.', 503);
    }

    $config = require $file;
    if (!is_array($config) || empty($config['db']['name'])) {
        throw new ApiException('config.php is incomplete. Check your database settings.', 503);
    }

    date_default_timezone_set(isset($config['app']['timezone']) ? $config['app']['timezone'] : 'Asia/Colombo');

    // Never leak PHP errors to the browser; log them instead.
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    $logDir = APP_ROOT . '/storage/logs';
    if (is_dir($logDir) && is_writable($logDir)) {
        ini_set('error_log', $logDir . '/php-error.log');
    }

    $GLOBALS['APP_CONFIG'] = $config;
    return $config;
}

function cfg($key, $default = null)
{
    $config = app_config();
    $parts = explode('.', $key);
    $value = $config;
    foreach ($parts as $part) {
        if (!is_array($value) || !array_key_exists($part, $value)) {
            return $default;
        }
        $value = $value[$part];
    }
    return $value;
}

function db()
{
    static $pdo = null;
    static $migrated = false;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = cfg('db');
    $configuredPort = !empty($db['port']) ? (int) $db['port'] : null;
    $options = array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    );

    $connect = function ($p) use ($db, $options) {
        $dsn = 'mysql:host=' . $db['host'] . ($p ? ';port=' . $p : '') . ';dbname=' . $db['name'] . ';charset=utf8mb4';
        return new PDO($dsn, $db['user'], $db['pass'], $options);
    };

    try {
        $pdo = $connect($configuredPort);
    } catch (PDOException $e) {
        $isLocal = in_array(strtolower($db['host']), array('localhost', '127.0.0.1', '::1'), true);
        if ($isLocal) {
            $fallbacks = ($configuredPort === 3307) ? array(3306, null) : array(3307, 3306, null);
            foreach ($fallbacks as $fb) {
                if ($fb === $configuredPort) {
                    continue;
                }
                try {
                    $pdo = $connect($fb);
                    break;
                } catch (PDOException $ex) {
                    // try next fallback
                }
            }
        }
        if (!($pdo instanceof PDO)) {
            throw $e;
        }
    }

    try {
        $pdo->exec("SET time_zone = '" . str_replace("'", '', cfg('app.db_timezone', '+05:30')) . "'");
    } catch (Throwable $e) {
        // Some shared hosts (like InfinityFree) restrict setting time_zone or lack tz tables
    }

    /* Run idempotent schema upgrades once per request. migrate_schema() and
       column_exists() receive this PDO directly and never call db() again,
       so there is no recursion / infinite loop. */
    if (!$migrated) {
        $migrated = true;
        migrate_schema($pdo);
    }

    return $pdo;
}

/* ---------------- schema upgrades ---------------- */

/* Databases created by older versions get new columns automatically,
   so an upgrade never needs a manual SQL import or a re-install.
   Every statement is idempotent. The PDO is passed in so this never
   calls db() again (no recursion). */
function column_exists($pdo, $table, $column)
{
    static $cache = array();
    $key = $table . '.' . $column;
    if (isset($cache[$key])) {
        return $cache[$key];
    }
    try {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?');
        $stmt->execute(array(cfg('db.name'), $table, $column));
        $cache[$key] = (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $e) {
        $cache[$key] = false;
    }
    return $cache[$key];
}

function migrate_schema($pdo)
{
    if (!column_exists($pdo, 'customers', 'note')) {
        $pdo->exec("ALTER TABLE customers ADD COLUMN note VARCHAR(1000) NOT NULL DEFAULT '' AFTER address");
    }
    /* stock_qty on bill_lines = quantity deducted from stock (in the item's
       stock unit). Existing bills fall back to the `qty` column. */
    if (!column_exists($pdo, 'bill_lines', 'stock_qty')) {
        $pdo->exec("ALTER TABLE bill_lines ADD COLUMN stock_qty DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER qty");
    }
}

/* ---------------- unit conversion ---------------- */

/* Stock is always kept in the item's `unit` (the stock unit).
   A bill line can be sold in any compatible unit; this converts between them.

   Weight : kg (base), g        (1 kg = 1000 g)
   Volume : ltr (base), ml      (1 ltr = 1000 ml)
   Count  : pcs (base), dozen   (1 dozen = 12 pcs)

   Units not in a group (pack, box, etc.) are treated 1:1 with themselves. */
$GLOBALS['UNIT_GROUPS'] = array(
    'weight' => array('kg' => 1.000, 'g'  => 0.001),
    'volume' => array('ltr'=> 1.000, 'ml' => 0.001),
    'count'  => array('pcs'   => 1.000, 'dozen' => 12.0),
);

function unit_group($unit)
{
    $unit = strtolower((string) $unit);
    foreach ($GLOBALS['UNIT_GROUPS'] as $group => $units) {
        if (isset($units[$unit])) {
            return $group;
        }
    }
    return null;
}

function unit_base_factor($unit)
{
    $unit = strtolower((string) $unit);
    foreach ($GLOBALS['UNIT_GROUPS'] as $group => $units) {
        if (isset($units[$unit])) {
            return (float) $units[$unit];
        }
    }
    return null;
}

/* Conversion factor: how many $toUnit equal one $fromUnit. */
function unit_ratio($fromUnit, $toUnit)
{
    $from = unit_base_factor($fromUnit);
    $to   = unit_base_factor($toUnit);
    if ($from === null || $to === null || $to === 0.0) {
        return 1.0;
    }
    return $from / $to;
}

/* Convert $qty from $fromUnit to $toUnit. Returns null when units are not
   compatible (different groups) or unknown. */
function convert_units($qty, $fromUnit, $toUnit)
{
    if (unit_group($fromUnit) !== unit_group($toUnit)) {
        return null;
    }
    return (float) $qty * unit_ratio($fromUnit, $toUnit);
}

/* Selling-unit qty -> qty in the item's stock unit. Returns null when
   incompatible (e.g. selling in ml when stocked in kg). */
function qty_to_stock_unit($qty, $sellingUnit, $stockUnit)
{
    $sellingUnit = strtolower((string) $sellingUnit);
    $stockUnit   = strtolower((string) $stockUnit);
    if ($sellingUnit === '' || $stockUnit === '') {
        return null;
    }
    if (unit_group($sellingUnit) !== unit_group($stockUnit)) {
        return null;
    }
    return round((float) $qty * unit_ratio($sellingUnit, $stockUnit), 3);
}

/* ---------------- JSON ---------------- */

function json_out($payload, $status = 200)
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('X-Content-Type-Options: nosniff');
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_ok($data = array())
{
    json_out(array('ok' => true, 'data' => $data), 200);
}

function json_fail($message, $status = 400)
{
    json_out(array('ok' => false, 'error' => $message), $status);
}

function body_json($maxBytes = 12582912)
{
    $length = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
    if ($length > $maxBytes) {
        throw new ApiException('The request is too large.', 413);
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        throw new ApiException('Empty request body.', 400);
    }
    if (strlen($raw) > $maxBytes) {
        throw new ApiException('The request is too large.', 413);
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new ApiException('Invalid JSON in request body.', 400);
    }
    return $data;
}

/* ---------------- input helpers ---------------- */

function arr($data, $key, $default = null)
{
    return (is_array($data) && array_key_exists($key, $data)) ? $data[$key] : $default;
}

function clean_text($value, $maxLength)
{
    $value = is_scalar($value) ? (string) $value : '';
    $value = str_replace(array("\0", "\r"), '', $value);
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength, 'UTF-8');
    }
    if (preg_match('//u', $value)) {
        $chars = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
        if (is_array($chars)) {
            return implode('', array_slice($chars, 0, $maxLength));
        }
    }
    return substr($value, 0, $maxLength);
}

function num_value($value, $min = null, $max = null, $default = 0.0)
{
    if ($value === null || $value === '' || !is_numeric($value)) {
        $value = $default;
    }
    $value = (float) $value;
    if (!is_finite($value)) {
        $value = 0.0;
    }
    if ($min !== null && $value < $min) {
        $value = $min;
    }
    if ($max !== null && $value > $max) {
        $value = $max;
    }
    return $value;
}

function int_value($value, $min = null, $max = null, $default = 0)
{
    return (int) round(num_value($value, $min, $max, $default));
}

function money_value($value)
{
    return round(num_value($value, 0, 999999999), 2);
}

/* ---------------- misc ---------------- */

function now_ms()
{
    return (int) round(microtime(true) * 1000);
}

function rand_id($prefix)
{
    return $prefix . '_' . bin2hex(random_bytes(7));
}

function valid_id($id)
{
    return is_string($id) && preg_match('/^[A-Za-z0-9_\-]{3,40}$/', $id) === 1;
}

function fmt_qty($n)
{
    $s = rtrim(rtrim(number_format((float) $n, 3, '.', ''), '0'), '.');
    return $s === '' ? '0' : $s;
}

function app_log($message)
{
    $dir = APP_ROOT . '/storage/logs';
    if (!is_dir($dir)) {
        return;
    }
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
    @file_put_contents($dir . '/app.log', $line, FILE_APPEND | LOCK_EX);
}

function is_installed()
{
    return is_file(APP_ROOT . '/storage/installed.lock') && is_file(APP_ROOT . '/config.php');
}

function app_version()
{
    return '2.1-php';
}
