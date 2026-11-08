# PHP + MySQL version — සිංහල පිහිටුවීමේ මාර්ගෝපදේශය

මේ ෆෝල්ඩරය තමයි ඔබේ POS එකේ **server version** එක. පෙනුම සහ වැඩ කරන විදිය
කලින් එකමයි. වෙනස: **stock, customer details, bills, payments, reports ඔක්කොම
දැන් ඔබේ hosting account එකේ MySQL database එකේ** save වෙනවා. Browser එකේ හෝ
phone එකේ data තියෙන්නේ නැහැ — server එකේ තමයි.

ඔබ ගන්න කියන **Linux Basic daStarter** (1GB SSD, Unlimited MySQL, DirectAdmin,
Free SSL) plan එක මේකට ප්‍රමාණවත්. Database එක ගොඩක් පොඩියි (MB ගණනක්).

---

## 1. Database එක හදන්න

DirectAdmin එකට log වෙන්න → **MySQL Management** → **Create new database**.

මේවා කොළයක ලියාගන්න:

- **Database name** — උදා: `youruser_austerra`
- **Database user** — උදා: `youruser_austerra`
- **Password** — ඔබ හදන strong password එක
- **Host** — සාමාන්‍යයෙන් `localhost`

> DirectAdmin එකේ දෙන username එකට `_` එකක් සහ නමක් එකතු වෙලා database name
> එක හැදෙනවා. ඒ නිසා හරියටම copy කරගන්න.

---

## 2. Files upload කරන්න

DirectAdmin → **File Manager** → `public_html` එකට යන්න.

1. මේ ෆෝල්ඩරයේ තියෙන **සියලුම files** (හෝ zip එක) upload කරන්න.
2. Zip එකක් නම් **Extract** කරන්න.
3. අවසානයේ `public_html` එකේ මේවා තියෙන්න ඕන:

```
index.php
api.php
install.php
config.sample.php
.htaccess
manifest.webmanifest
sw.js
assets/
lib/
sql/
storage/
```

> `assets`, `lib`, `sql`, `storage` folders ටික අනිවාර්යයෙන් තියෙන්න ඕන.
> ඒවා ඇතුළේ files ටික එකින් එක upload කරන්න ඕන නැහැ — folder එකම upload කරන්න.

---

## 3. Installer එක run කරන්න

Browser එකේ open කරන්න:

```
https://yourdomain.com/install.php
```

එතන පුරවන්න:

- MySQL host, database name, user, password
- ඔබට ඕන **admin username** එක සහ **strong password** එකක් (අවම අකුරු 6)
- Shop name එක

**Install now** ඔබන්න. එතකොට tables, admin login එක සහ `config.php` හැදෙනවා.

---

## 4. Installer එක delete කරන්න

File Manager එකෙන් `install.php` delete කරන්න.

(Security එකට lock file එකකුත් හැදෙනවා. ඒත් file එක delete කරන එක වඩා හොඳයි.)

---

## 5. Log වෙන්න

Open කරන්න:

```
https://yourdomain.com/
```

ඔබ හදපු username/password එකෙන් sign in වෙන්න.

**Inventory & Stock** එකේ ඔබේ items, ගණන, cost, selling price දාන්න.
ඊට පස්සේ **POS Billing** එකෙන් bill කරන්න පුළුවන්.

---

## 6. පරණ data ගෙන එන්න (optional)

කලින් browser version එක පාවිච්චි කරලා නම්:

1. පරණ app එකේ **Settings → Data & backup → Export backup** ඔබලා JSON file එක download කරන්න.
2. අලුත් PHP app එකේ **Settings → Data & backup → Import** ඔබලා ඒ file එක තෝරන්න.

Items, customers, bills, settings ඔක්කොම server එකට එනවා.

---

## දිනපතා කරන්න ඕන දේවල්

| කවදාද | කරන්න |
| --- | --- |
| දවස අන්තිමේ | **Day End** → daily report print කරන්න |
| සතියට වරක් | **Settings → Export backup** → JSON file එක download කරලා safe තැනක තියන්න |
| මාසයට වරක් | DirectAdmin backup එකක් තියෙනවද බලන්න (hosting provider ගෙන්) |

> Server එකේ data තිබ්බත් backup එකක් තියාගන්න එක අනිවාර්යයි.
> ඒක ඔබේ customer details තියෙන file එකක් නිසා public folder එකක තියන්න එපා.

---

## Security — මේවා කරන්න

1. **HTTPS** on කරන්න: DirectAdmin → SSL Certificates → Let's Encrypt → Force HTTPS.
2. Admin password එක **admin123** වගේ එකක් දෙන්න එපා.
3. `config.php` එකේ ඔබේ database password එක තියෙනවා — ඒක කාටවත් එවන්න එපා.
4. `install.php` install කරාට පස්සේ delete කරන්න.
5. එකම password එක hosting login එකට සහ database එකට දෙන්න එපා.

මේවා app එකේම කරලා තියෙනවා:

- Password **hash** කරලා save කරනවා (plain text නෙවෙයි)
- Login session server එකේ, CSRF protection, SQL injection protection
- Bill එකක් save කරද්දී stock එකත් bill number එකත් **database transaction** එකක් ඇතුළේ check වෙනවා
- Login attempt 6ක් fail වුණොත් තවත් try කරන්න බැහැ (15 min)
- හැම වැදගත් action එකක්ම `audit_log` එකේ save වෙනවා

---

## Reports (phpMyAdmin)

DirectAdmin → **phpMyAdmin** → ඔබේ database එක → **SQL** tab එකේ මේවා run කරන්න:

```sql
-- දිනපතා sales සහ profit
SELECT * FROM v_daily_sales ORDER BY sale_date DESC;

-- Stock අඩු items
SELECT * FROM v_low_stock;

-- Customer credit (ණය)
SELECT * FROM v_customer_credit WHERE balance_due > 0;
```

App එකේ **Sales Reports** page එකේ daily / weekly / monthly reports තියෙනවා.
ඒවා print කරන්නත් පුළුවන්.

---

## ගැටලුවක් ආවොත්

| ප්‍රශ්නය | විසඳුම |
| --- | --- |
| "Application is not installed" | `install.php` open කරලා install එක කරන්න |
| "Database connection failed" | `config.php` එකේ DB name/user/password බලන්න. DirectAdmin එකේ user එක database එකට add කරලා තියෙනවද බලන්න |
| Blank page / 500 error | DirectAdmin → Select PHP Version → PHP 8.x තෝරන්න. `storage/logs/php-error.log` බලන්න |
| Login එකේ "session token expired" | Cookies clear කරලා ආයෙ try කරන්න. `www` තියෙන නම සහ නැති නම මිශ්‍ර කරන්න එපා |
| Save වෙන්නේ නැහැ | `storage/` folder එක writable ද බලන්න, DB user ට INSERT/UPDATE/DELETE permission තියෙනවද බලන්න |
| "Not enough stock" | වෙන device එකකින් ඒ item එක විකුණලා. App එක අලුත් stock එක refresh කරනවා |
| PHP file එක download වෙනවා | Domain එකට PHP enable කරලා නැහැ. DirectAdmin එකෙන් PHP on කරන්න |

---

## Node.js ගැන

කලින් තිබ්බ `serve.js` එක Node එකෙන් files serve කරන්න විතරයි. Data ඔක්කොම
browser එකේ තිබ්බා. දැන් ඒ වෙනුවට PHP + MySQL තියෙනවා. ඒ නිසා **Node.js
අවශ්‍ය නැහැ**.

මුල් version එක parent folder එකේ තියෙනවා — ඕන නම් compare කරන්න පුළුවන්.
