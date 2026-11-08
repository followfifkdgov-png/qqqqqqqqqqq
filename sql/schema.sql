-- ============================================================
--  Austerra Agri Solutions POS - MySQL / MariaDB Schema
--  Unified schema for WAMP, phpMyAdmin, InfinityFree & Live Hosting
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Users (login)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(64)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          VARCHAR(20)  NOT NULL DEFAULT 'admin',
  `must_change`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`    BIGINT       NOT NULL DEFAULT 0,
  `updated_at`    BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Shop profile (single row, id = 1)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shop` (
  `id`           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `name`         VARCHAR(120) NOT NULL DEFAULT 'AUSTERRA AGRI SOLUTIONS',
  `legal_name`   VARCHAR(160) NOT NULL DEFAULT '',
  `tagline`      VARCHAR(120) NOT NULL DEFAULT 'Agri Solutions',
  `address`      VARCHAR(255) NOT NULL DEFAULT '',
  `phone`        VARCHAR(60)  NOT NULL DEFAULT '',
  `email`        VARCHAR(120) NOT NULL DEFAULT '',
  `currency`     VARCHAR(12)  NOT NULL DEFAULT 'Rs.',
  `target`       DECIMAL(12,2) NOT NULL DEFAULT 0,
  `bill_printer` VARCHAR(20)  NOT NULL DEFAULT 'dot',
  `bill_paper`   VARCHAR(20)  NOT NULL DEFAULT '9.5x5.5',
  `report_paper` VARCHAR(20)  NOT NULL DEFAULT '9.5x11',
  `updated_at`   BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Application state (bill sequence, day open/closed, UI prefs)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_state` (
  `id`            TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `seq`           INT UNSIGNED NOT NULL DEFAULT 1001,
  `counter`       VARCHAR(12)  NOT NULL DEFAULT '01',
  `day_open`      TINYINT(1)   NOT NULL DEFAULT 1,
  `day_opened_at` BIGINT       NOT NULL DEFAULT 0,
  `day_closed_at` BIGINT       NULL,
  `prefs`         LONGTEXT     NULL,
  `updated_at`    BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Stock items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `items` (
  `id`         VARCHAR(40)   NOT NULL,
  `name`       VARCHAR(160)  NOT NULL,
  `category`   VARCHAR(80)   NOT NULL DEFAULT 'General',
  `unit`       VARCHAR(16)   NOT NULL DEFAULT 'pcs',
  `cost`       DECIMAL(12,2) NOT NULL DEFAULT 0,
  `price`      DECIMAL(12,2) NOT NULL DEFAULT 0,
  `qty`        DECIMAL(12,3) NOT NULL DEFAULT 0,
  `reorder`    DECIMAL(12,3) NOT NULL DEFAULT 0,
  `active`     TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at` BIGINT        NOT NULL DEFAULT 0,
  `updated_at` BIGINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_items_active` (`active`),
  KEY `idx_items_name` (`name`),
  KEY `idx_items_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Customers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id`         VARCHAR(40)   NOT NULL,
  `name`       VARCHAR(160)  NOT NULL,
  `phone`      VARCHAR(60)   NOT NULL DEFAULT '',
  `address`    VARCHAR(255)  NOT NULL DEFAULT '',
  `note`       VARCHAR(1000) NOT NULL DEFAULT '',
  `created_at` BIGINT        NOT NULL DEFAULT 0,
  `updated_at` BIGINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_customers_name` (`name`),
  KEY `idx_customers_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Bills (invoices)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bills` (
  `id`            VARCHAR(40)   NOT NULL,
  `no`            VARCHAR(40)   NOT NULL,
  `ts`            BIGINT        NOT NULL,
  `cashier`       VARCHAR(64)   NOT NULL DEFAULT '',
  `customer_id`   VARCHAR(40)   NULL,
  `customer_name` VARCHAR(160)  NOT NULL DEFAULT 'Walk-in customer',
  `subtotal`      DECIMAL(12,2) NOT NULL DEFAULT 0,
  `discount`      DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total`         DECIMAL(12,2) NOT NULL DEFAULT 0,
  `paid`          DECIMAL(12,2) NOT NULL DEFAULT 0,
  `balance`       DECIMAL(12,2) NOT NULL DEFAULT 0,
  `profit`        DECIMAL(12,2) NOT NULL DEFAULT 0,
  `method`        VARCHAR(20)   NOT NULL DEFAULT 'Cash',
  `bank_name`     VARCHAR(80)   NOT NULL DEFAULT '',
  `cheque_no`     VARCHAR(40)   NOT NULL DEFAULT '',
  `note`          VARCHAR(255)  NOT NULL DEFAULT '',
  `created_at`    BIGINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bills_no` (`no`),
  KEY `idx_bills_ts` (`ts`),
  KEY `idx_bills_customer` (`customer_id`),
  KEY `idx_bills_method` (`method`),
  CONSTRAINT `fk_bills_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Bill lines (items sold per bill)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bill_lines` (
  `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bill_id`   VARCHAR(40)   NOT NULL,
  `item_id`   VARCHAR(40)   NOT NULL,
  `name`      VARCHAR(160)  NOT NULL DEFAULT '',
  `unit`      VARCHAR(16)   NOT NULL DEFAULT 'pcs',
  `price`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  `cost`      DECIMAL(12,2) NOT NULL DEFAULT 0,
  `qty`       DECIMAL(12,3) NOT NULL DEFAULT 0,
  `stock_qty` DECIMAL(12,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_lines_bill` (`bill_id`),
  KEY `idx_lines_item` (`item_id`),
  CONSTRAINT `fk_lines_bill` FOREIGN KEY (`bill_id`)
    REFERENCES `bills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Day sessions (history of opened/closed counters)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `day_sessions` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `opened_at`  BIGINT        NOT NULL DEFAULT 0,
  `closed_at`  BIGINT        NOT NULL DEFAULT 0,
  `cashier`    VARCHAR(64)   NOT NULL DEFAULT '',
  `bill_count` INT UNSIGNED  NOT NULL DEFAULT 0,
  `total`      DECIMAL(12,2) NOT NULL DEFAULT 0,
  `paid`       DECIMAL(12,2) NOT NULL DEFAULT 0,
  `profit`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_day_closed` (`closed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Login rate limiting
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip`       VARCHAR(45) NOT NULL DEFAULT '',
  `username` VARCHAR(64) NOT NULL DEFAULT '',
  `at`       BIGINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_attempts_ip` (`ip`, `at`),
  KEY `idx_attempts_user` (`username`, `at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Audit trail
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `at`       BIGINT       NOT NULL DEFAULT 0,
  `username` VARCHAR(64)  NOT NULL DEFAULT '',
  `action`   VARCHAR(60)  NOT NULL DEFAULT '',
  `detail`   VARCHAR(255) NOT NULL DEFAULT '',
  `ip`       VARCHAR(45)  NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_audit_at` (`at`),
  KEY `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Reporting views
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW `v_daily_sales` AS
SELECT DATE(FROM_UNIXTIME(ts / 1000)) AS sale_date,
       COUNT(*)                        AS bills,
       SUM(total)                      AS total,
       SUM(paid)                       AS paid,
       SUM(GREATEST(total - paid, 0))  AS balance,
       SUM(profit)                     AS profit
FROM `bills`
GROUP BY DATE(FROM_UNIXTIME(ts / 1000));

CREATE OR REPLACE VIEW `v_low_stock` AS
SELECT id, name, category, unit, qty, reorder, cost, price
FROM `items`
WHERE active = 1 AND qty <= reorder;

CREATE OR REPLACE VIEW `v_customer_credit` AS
SELECT c.id,
       c.name,
       c.phone,
       COUNT(b.id)                                        AS bills,
       COALESCE(SUM(GREATEST(b.total - b.paid, 0)), 0)    AS balance_due
FROM `customers` c
LEFT JOIN `bills` b ON b.customer_id = c.id
GROUP BY c.id, c.name, c.phone;

-- ------------------------------------------------------------
-- Default Seed Data
-- ------------------------------------------------------------

-- Default Admin User (username: admin / password: admin123)
INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `role`, `must_change`, `created_at`, `updated_at`)
VALUES (1, 'admin', '$2y$10$qZya9YdRFyK2pmgPB5HDGuX4k.MwoGbPuwGCVBYLUFI8Dp6NTHBOa', 'admin', 0, 1700000000000, 1700000000000);

-- Default Shop profile
INSERT IGNORE INTO `shop` (`id`, `name`, `legal_name`, `tagline`, `address`, `phone`, `email`, `currency`, `target`, `bill_printer`, `bill_paper`, `report_paper`, `updated_at`)
VALUES (1, 'AUSTERRA AGRI SOLUTIONS', 'AUSTERRA AGRI SOLUTIONS (PVT) LTD', 'Agri Solutions', '176/4, Kaluwagaha Addara Waththa, Godakanda, Galle, Sri Lanka', '+94 77 303 5055', 'austerraagrisolutions@gmail.com', 'Rs.', 10000.00, 'dot', '9.5x5.5', '9.5x11', 1700000000000);

-- Default Application State
INSERT IGNORE INTO `app_state` (`id`, `seq`, `counter`, `day_open`, `day_opened_at`, `day_closed_at`, `prefs`, `updated_at`)
VALUES (1, 1001, '01', 1, 1700000000000, NULL, '{\"theme\":\"dark\"}', 1700000000000);

SET FOREIGN_KEY_CHECKS = 1;
