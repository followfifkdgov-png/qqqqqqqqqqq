<?php
/* Austerra Agri Solutions POS - Configuration
   Database settings for WAMP / Production */

return array (
  'db' => 
  array (
    'host' => '127.0.0.1',
    'port' => 3306,
    'name' => 'austerra_pos',
    'user' => 'root',
    'pass' => '',
  ),
  'app' => 
  array (
    'timezone' => 'Asia/Colombo',
    'db_timezone' => '+05:30',
    'session_name' => 'austerra_pos_sid',
    'name' => 'Austerra Agri Solutions POS',
  ),
);
