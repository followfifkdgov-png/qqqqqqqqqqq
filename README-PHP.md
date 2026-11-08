# Austerra POS — PHP + MySQL version

This folder is the **server version** of the POS. The look and behaviour are the same as the
original app, but stock, customers, bills, payments and reports are now stored in **MySQL on
your hosting account** instead of the browser.

---

## What you get

| Old version (Node / browser) | This version (PHP + MySQL) |
| --- | --- |
| Data in `localStorage` on one device | Data in MySQL on your server |
| `serve.js` (Node) only serves files | PHP API (`api.php`) reads/writes the database |
| Login checked in the browser | Login checked on the server with hashed passwords |
| Anyone with the file could read the data | Every request requires a signed-in session |
| One device at a time | Phone, tablet and desktop can all use the same data |

Everything else is unchanged: same screens, same receipt printing, same reports.

---

## Requirements (your hosting plan is enough)

- PHP **7.4 or newer** (PHP 8.0–8.3 recommended)
- MySQL 5.7+ or MariaDB 10.2+
- Apache with `.htaccess` support (DirectAdmin / cPanel)
- HTTPS (free Let's Encrypt SSL is perfect)

The **Linux Basic daStarter** plan in the screenshot (1 GB SSD, unlimited MySQL, DirectAdmin,
free SSL) is enough for one shop. 1 GB is for files/e-mail — the POS database itself is tiny.

---

## Install in 6 steps (DirectAdmin)

### 1. Create the database

DirectAdmin → **MySQL Management** → **Create new database**.

Write down:

- Database name (often looks like `myuser_austerra`)
- Database user (often the same prefix)
- Database password
- Host: usually `localhost`

### 2. Upload the files

DirectAdmin → **File Manager** → open `public_html` (or a subfolder like `public_html/pos`).

Upload the ZIP from this project and extract it, **or** upload the contents of this `php-app`
folder. After uploading, `public_html` should look like:

```
index.php
api.php
install.php
config.sample.php
.htaccess
manifest.webmanifest
sw.js
assets/        (css, js, img)
lib/           (app.php, auth.php, data.php)
sql/           (schema.sql)
storage/       (logs, installed.lock after install)
```

> Keep the folder structure exactly. Do not put everything inside an extra `php-app` folder
> unless you want the app at `https://yourdomain.com/php-app/`.

### 3. Run the installer

Open:

```
https://yourdomain.com/install.php
```

Fill in:

- MySQL host, database name, user, password
- Your admin username and a **strong password**
- Shop name (you can change it later)

Press **Install now**. The installer creates the tables, the admin login and `config.php`.

### 4. Delete the installer

DirectAdmin File Manager → delete `install.php`.

A lock file (`storage/installed.lock`) also stops it from running again, but deleting the file
is safer.

### 5. Sign in

Open `https://yourdomain.com/` and sign in with the username/password you created.

Add your items in **Inventory & Stock**, then start billing.

### 6. Move your old data (optional)

If you already used the browser version:

1. Old app → **Settings → Data & backup → Export backup** (downloads a JSON file).
2. New PHP app → **Settings → Data & backup → Import** → choose that JSON file.

Stock, customers, bills, settings and the bill sequence are restored on the server.

---

## Security built in

- Passwords stored with PHP `password_hash()` (bcrypt/Argon2) — never plain text.
- Server-side sessions, `HttpOnly` + `SameSite=Lax` cookies, session ID regenerated on login.
- CSRF token required for every write.
- Prepared statements everywhere (no SQL injection).
- Login rate limiting (6 failures / 15 minutes per IP + username).
- All totals, stock checks and bill numbers computed **inside a database transaction** on the
  server, so two phones cannot sell the same last item or reuse a bill number.
- `config.php`, `lib/`, `sql/` and `storage/` are blocked from the web by `.htaccess`.
- Installer locks itself after installation.
- Audit log table records logins, bill creation/deletion, password changes and restores.
- Automatic session timeout after 12 hours.

Recommended on the hosting side:

- Force HTTPS (DirectAdmin → SSL Certificates → Let's Encrypt, then redirect HTTP → HTTPS).
- Use a database password that is different from your hosting password.
- Daily/weekly **Export backup** and let your host keep server backups.

---

## Database structure

| Table | What it stores |
| --- | --- |
| `users` | Admin login (hashed password, must-change flag) |
| `shop` | Shop profile, currency, target, printing preferences |
| `app_state` | Bill sequence, day open/closed, UI preferences |
| `items` | Stock, cost, selling price, reorder level, active flag |
| `customers` | Name, phone, address |
| `bills` | One row per bill (totals, paid, balance, profit, payment method, bank/cheque) |
| `bill_lines` | Products sold on each bill (price and cost at sale time) |
| `day_sessions` | History of every closed day |
| `audit_log` | Who did what, when |
| `login_attempts` | Login rate limiting |

Ready-made report views (open **phpMyAdmin → SQL**):

```sql
-- Daily sales, payments and profit
SELECT * FROM v_daily_sales ORDER BY sale_date DESC;

-- Items at or below reorder level
SELECT * FROM v_low_stock;

-- Outstanding customer credit
SELECT * FROM v_customer_credit WHERE balance_due > 0;

-- Top selling products (last 30 days)
SELECT bl.name, SUM(bl.qty) AS qty, SUM(bl.price * bl.qty) AS revenue
FROM bill_lines bl
JOIN bills b ON b.id = bl.bill_id
WHERE b.ts >= (UNIX_TIMESTAMP() - 30*86400) * 1000
GROUP BY bl.name
ORDER BY revenue DESC;
```

`v_daily_sales` groups by the date in the database session timezone (`+05:30`), so it matches
Sri Lanka dates.

---

## Files added / changed compared with the old app

```
index.php              new — app shell (redirects to installer on first run)
api.php                new — the whole JSON API
install.php            new — one-time installer (delete after use)
config.sample.php      new — manual configuration template
lib/app.php            new — config, PDO, JSON helpers
lib/auth.php           new — sessions, CSRF, login, rate limit, audit
lib/data.php           new — shop/items/customers/bills + backup/restore
sql/schema.sql         new — tables and report views
.htaccess              new — security and caching rules
storage/               new — logs + install lock (blocked from web)
assets/js/store.js     rewritten — server data layer (same API the UI uses)
assets/js/app.js       small changes — async start-up, session-expired handling
assets/js/views.js     small changes — await server calls for bill/login/backup
assets/js/ui.js        unchanged
assets/css/styles.css  unchanged
sw.js                  updated — never caches API responses
manifest.webmanifest   updated — start URL is index.php
```

The old Node version is untouched in the parent folder, so you can always compare or go back.

---

## Customising the shop

- **Shop name, address, phone, email, currency, printing** — Settings → Shop profile / Printing.
- **Logo** — replace `assets/img/austerra-logo.jpeg` with your own square image (JPG).
  Replace `assets/img/austerra-icon.png` (512×512 PNG) for the phone home-screen icon.
- **Colours** — the CSS variables at the top of `assets/css/styles.css`.
- **Receipt layout** — `assets/js/ui.js` (`printReceipt`, `printReport`).

---

## Notes for daily use

- All devices that open the same address share the same stock, bills and customers.
- The app needs a working internet connection to reach your hosting server (data is not kept in
  the browser any more). The interface itself still loads from the offline cache.
- Use the refresh button (or reload the page) to pull the latest data on a second device.
- The day control, targets, bill numbering, receipt printing and reports work exactly as before.
- Billing blocks when the day is closed; open a new day from Settings.

---

## Backups

- **Settings → Export backup** downloads a complete JSON snapshot from MySQL.
- **Import** restores it (replaces all items, customers, bills and settings).
- Hosting-level backups in DirectAdmin are also recommended.
- The JSON backup contains customer details — store it privately, not in a public folder.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| “Application is not installed yet” | Open `install.php` and complete the form |
| “Database connection failed” | Check DB name/user/password in `config.php`; in DirectAdmin make sure the user is added to the database |
| Blank page or 500 error | DirectAdmin → Select PHP Version → set PHP 8.x; check `storage/logs/php-error.log` |
| Login says “session token expired” | Clear cookies for the site and reload; make sure the domain uses one spelling (with/without `www`) |
| Changes do not save | Check `storage/` is writable (permissions 755/775) and the database user has INSERT/UPDATE/DELETE |
| Bill says “Not enough stock” | Another device sold the item; the app refreshes the latest stock |
| Old data missing | Import the JSON backup from the old app |
| PHP files download instead of running | PHP is not enabled for the domain in DirectAdmin |

---

## A note about “Node.js”

The original app never needed Node for its data — `serve.js` only served static files; all data
was in the browser. This version replaces that server layer with PHP and adds a real database,
which is what your hosting plan supports. You no longer need Node at all.
