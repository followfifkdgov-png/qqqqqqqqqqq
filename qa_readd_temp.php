<?php
require_once __DIR__ . '/lib/app.php';
require_once __DIR__ . '/lib/auth.php';
$db = db();
$db->prepare('INSERT INTO users (username, password_hash, role, must_change, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)')
   ->execute(array('qa-demo', password_hash('qa-parade2024', PASSWORD_DEFAULT), 'admin', now_ms(), now_ms()));
echo "qa-demo recreated\n";
