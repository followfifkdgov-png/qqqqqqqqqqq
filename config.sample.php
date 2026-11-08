<?php
/* ============================================================
   Austerra Agri Solutions POS - sample configuration
   ------------------------------------------------------------
   install.php writes config.php for you. Only copy this file
   to config.php if you prefer to set things up by hand.
   ============================================================ */

return array(
    'db' => array(
        'host' => 'localhost',          // MySQL host from DirectAdmin
        'port' => null,                 // e.g. 3306, or null for default
        'name' => 'your_db_name',       // e.g. user_austerra
        'user' => 'your_db_user',       // e.g. user_austerra
        'pass' => 'your_db_password',
    ),
    'app' => array(
        'timezone'     => 'Asia/Colombo',
        'db_timezone'  => '+05:30',
        'session_name' => 'austerra_pos_sid',
        'name'         => 'Austerra Agri Solutions POS',
    ),
);
