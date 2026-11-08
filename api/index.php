<?php
/* Vercel entry point: every PHP request is routed here (see vercel.json)
   and dispatched to the matching root script. */

$root = dirname(__DIR__);
$path = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$path = '/' . ltrim((string) $path, '/');

$routes = array(
    '/'            => 'index.php',
    '/index.php'   => 'index.php',
    '/api.php'     => 'api.php',
    '/install.php' => 'install.php',
);

if (!isset($routes[$path])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    exit;
}

$script = $root . '/' . $routes[$path];
$_SERVER['SCRIPT_FILENAME'] = $script;
$_SERVER['SCRIPT_NAME'] = $path === '/' ? '/index.php' : $path;
$_SERVER['PHP_SELF'] = $_SERVER['SCRIPT_NAME'];
chdir($root);
require $script;
