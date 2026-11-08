<?php
/* ============================================================
   Austerra Agri Solutions POS - sessions, CSRF and login
   ============================================================ */

if (!defined('APP_ROOT')) {
    define('APP_ROOT', dirname(__DIR__));
}

require_once __DIR__ . '/app.php';

define('SESSION_IDLE_SECONDS', 43200);      // 12 hours
define('LOGIN_WINDOW_SECONDS', 900);        // 15 minutes
define('LOGIN_MAX_FAILURES', 6);            // per IP + username

function is_https()
{
    if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443) {
        return true;
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
        return true;
    }
    return false;
}

class DbSessionHandler implements SessionHandlerInterface
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    public function open($path, $name): bool
    {
        $this->pdo->exec('CREATE TABLE IF NOT EXISTS `php_sessions` (
            `id` VARCHAR(128) NOT NULL PRIMARY KEY,
            `data` MEDIUMTEXT NOT NULL,
            `updated_at` INT UNSIGNED NOT NULL,
            KEY `idx_updated` (`updated_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read($id): string|false
    {
        $stmt = $this->pdo->prepare('SELECT data FROM php_sessions WHERE id = ? AND updated_at > ?');
        $stmt->execute(array($id, time() - SESSION_IDLE_SECONDS));
        $row = $stmt->fetch();
        return $row ? (string) $row['data'] : '';
    }

    public function write($id, $data): bool
    {
        $stmt = $this->pdo->prepare('REPLACE INTO php_sessions (id, data, updated_at) VALUES (?, ?, ?)');
        return $stmt->execute(array($id, $data, time()));
    }

    public function destroy($id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM php_sessions WHERE id = ?');
        return $stmt->execute(array($id));
    }

    public function gc($max_lifetime): int|false
    {
        $stmt = $this->pdo->prepare('DELETE FROM php_sessions WHERE updated_at < ?');
        $stmt->execute(array(time() - SESSION_IDLE_SECONDS));
        return $stmt->rowCount();
    }
}

function start_session()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $name = cfg('app.session_name', 'austerra_pos_sid');
    if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
        $name = 'austerra_pos_sid';
    }

    if (!headers_sent()) {
        // Keep signed-in sessions alive for the same idle window as the app.
        @ini_set('session.gc_maxlifetime', (string) SESSION_IDLE_SECONDS);
        @ini_set('session.use_strict_mode', '1');
        @ini_set('session.use_only_cookies', '1');
        @ini_set('session.cookie_httponly', '1');

        session_name($name);
        session_set_cookie_params(array(
            'lifetime' => 0,
            'path'     => '/',
            'httponly' => true,
            'secure'   => is_https(),
            'samesite' => 'Lax',
        ));
    }

    if (is_serverless() && !headers_sent()) {
        // Each Vercel function instance has its own /tmp, so file sessions get lost between requests.
        session_set_save_handler(new DbSessionHandler(db()), true);
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }

    if (empty($_SESSION['csrf'])) {
        try {
            $_SESSION['csrf'] = bin2hex(random_bytes(24));
        } catch (Throwable $e) {
            $_SESSION['csrf'] = md5(uniqid(mt_rand(), true));
        }
    }
}

function csrf_token()
{
    start_session();
    return isset($_SESSION['csrf']) ? $_SESSION['csrf'] : '';
}

function require_csrf()
{
    start_session();
    $sent = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? (string) $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
    if ($sent === '' && isset($_POST['_csrf'])) {
        $sent = (string) $_POST['_csrf'];
    }
    $known = isset($_SESSION['csrf']) ? (string) $_SESSION['csrf'] : '';
    if ($known === '' || $sent === '' || !hash_equals($known, $sent)) {
        throw new ApiException('Your session security token expired. Please refresh the page and try again.', 419);
    }
}

function client_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? substr((string) $_SERVER['REMOTE_ADDR'], 0, 45) : '';
}

function current_user()
{
    static $loaded = false;
    static $user = null;

    if ($loaded) {
        return $user;
    }
    $loaded = true;

    start_session();
    if (empty($_SESSION['uid'])) {
        return null;
    }

    $last = isset($_SESSION['last_seen']) ? (int) $_SESSION['last_seen'] : 0;
    if ($last > 0 && (time() - $last) > SESSION_IDLE_SECONDS) {
        destroy_session();
        return null;
    }

    $stmt = db()->prepare('SELECT id, username, role, must_change FROM users WHERE id = ? LIMIT 1');
    $stmt->execute(array((int) $_SESSION['uid']));
    $row = $stmt->fetch();
    if (!$row) {
        destroy_session();
        return null;
    }

    $_SESSION['last_seen'] = time();
    $user = $row;
    return $user;
}

function require_auth()
{
    $user = current_user();
    if (!$user) {
        throw new ApiException('Your session has expired. Please sign in again.', 401);
    }
    return $user;
}

function destroy_session()
{
    $_SESSION = array();
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

function recent_failures($ip, $username)
{
    $since = time() - LOGIN_WINDOW_SECONDS;
    $stmt = db()->prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND username = ? AND at >= ?');
    $stmt->execute(array($ip, $username, $since));
    $row = $stmt->fetch();
    return $row ? (int) $row['n'] : 0;
}

function record_failure($ip, $username)
{
    $stmt = db()->prepare('INSERT INTO login_attempts (ip, username, at) VALUES (?, ?, ?)');
    $stmt->execute(array($ip, $username, time()));

    // Keep the table small.
    db()->prepare('DELETE FROM login_attempts WHERE at < ?')->execute(array(time() - 86400));
}

function clear_failures($ip, $username)
{
    $stmt = db()->prepare('DELETE FROM login_attempts WHERE ip = ? AND username = ?');
    $stmt->execute(array($ip, $username));
}

function login_user($username, $password)
{
    $username = clean_text($username, 64);
    $password = is_string($password) ? $password : '';

    if ($username === '' || $password === '') {
        throw new ApiException('Enter your username and password.', 400);
    }

    $ip = client_ip();
    if (recent_failures($ip, $username) >= LOGIN_MAX_FAILURES) {
        throw new ApiException('Too many failed attempts. Wait about 15 minutes and try again.', 429);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute(array($username));
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        record_failure($ip, $username);
        throw new ApiException('Incorrect username or password.', 401);
    }

    clear_failures($ip, $username);

    // Upgrade the hash if PHP's default algorithm changes.
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = db()->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
        $stmt->execute(array($newHash, now_ms(), $user['id']));
    }

    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $user['id'];
    $_SESSION['last_seen'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(24));

    audit('login', 'Signed in as ' . $user['username']);

    unset($user['password_hash']);
    return $user;
}

function logout_user()
{
    $user = current_user();
    if ($user) {
        audit('logout', 'Signed out');
    }
    destroy_session();
}

function audit($action, $detail = '')
{
    try {
        $user = current_user();
        $stmt = db()->prepare('INSERT INTO audit_log (at, username, action, detail, ip) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute(array(
            now_ms(),
            $user ? $user['username'] : '',
            clean_text($action, 60),
            clean_text($detail, 255),
            client_ip(),
        ));
    } catch (Throwable $e) {
        // Auditing must never break the request.
        app_log('audit failed: ' . $e->getMessage());
    }
}
