<?php
/* ============================================================
   Austerra Agri Solutions POS - data access & serialisation
   All reads/writes of shop, stock, customers and bills.
   ============================================================ */

if (!defined('APP_ROOT')) {
    define('APP_ROOT', dirname(__DIR__));
}

require_once __DIR__ . '/app.php';
require_once __DIR__ . '/auth.php';

function default_shop()
{
    return array(
        'name'         => 'AUSTERRA AGRI SOLUTIONS',
        'legalName'    => 'AUSTERRA AGRI SOLUTIONS (PVT) LTD',
        'tagline'      => 'Agri Solutions',
        'address'      => '176/4, Kaluwagaha Addara Waththa, Godakanda, Galle, Sri Lanka',
        'phone'        => '+94 77 303 5055',
        'email'        => 'austerraagrisolutions@gmail.com',
        'currency'     => 'Rs.',
        'target'       => 10000,
        'billPrinter'  => 'dot',
        'billPaper'    => '9.5x5.5',
        'reportPaper'  => '9.5x11',
    );
}

function default_prefs()
{
    return array('theme' => 'dark');
}

function ensure_default_rows()
{
    $pdo = db();
    $s = default_shop();
    $now = now_ms();

    $pdo->prepare('INSERT IGNORE INTO shop
        (id, name, legal_name, tagline, address, phone, email, currency, target, bill_printer, bill_paper, report_paper, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute(array(
            $s['name'], $s['legalName'], $s['tagline'], $s['address'], $s['phone'],
            $s['email'], $s['currency'], $s['target'], $s['billPrinter'],
            $s['billPaper'], $s['reportPaper'], $now,
        ));

    $pdo->prepare('INSERT IGNORE INTO app_state
        (id, seq, counter, day_open, day_opened_at, day_closed_at, prefs, updated_at)
        VALUES (1, 1001, ?, 1, ?, NULL, ?, ?)')
        ->execute(array('01', $now, json_encode(default_prefs()), $now));
}

/* ---------------- shop / state ---------------- */

function shop_out()
{
    $row = db()->query('SELECT * FROM shop WHERE id = 1')->fetch();
    if (!$row) {
        return default_shop();
    }
    return array(
        'name'        => $row['name'],
        'legalName'   => $row['legal_name'],
        'tagline'     => $row['tagline'],
        'address'     => $row['address'],
        'phone'       => $row['phone'],
        'email'       => $row['email'],
        'currency'    => $row['currency'],
        'target'      => (float) $row['target'],
        'billPrinter' => $row['bill_printer'],
        'billPaper'   => $row['bill_paper'],
        'reportPaper' => $row['report_paper'],
    );
}

function shop_save($data)
{
    if (!is_array($data)) {
        return;
    }

    $map = array(
        'name'        => array('name', 120),
        'legalName'   => array('legal_name', 160),
        'tagline'     => array('tagline', 120),
        'address'     => array('address', 255),
        'phone'       => array('phone', 60),
        'email'       => array('email', 120),
        'currency'    => array('currency', 12),
        'billPrinter' => array('bill_printer', 20),
        'billPaper'   => array('bill_paper', 20),
        'reportPaper' => array('report_paper', 20),
    );

    $sets = array();
    $args = array();
    foreach ($map as $key => $meta) {
        if (array_key_exists($key, $data)) {
            $sets[] = $meta[0] . ' = ?';
            $args[] = clean_text($data[$key], $meta[1]);
        }
    }
    if (array_key_exists('target', $data)) {
        $sets[] = 'target = ?';
        $args[] = money_value($data['target']);
    }

    if (!$sets) {
        return;
    }

    $sets[] = 'updated_at = ?';
    $args[] = now_ms();
    $args[] = 1;

    $sql = 'UPDATE shop SET ' . implode(', ', $sets) . ' WHERE id = ?';
    db()->prepare($sql)->execute($args);
}

function prefs_out()
{
    $row = db()->query('SELECT prefs FROM app_state WHERE id = 1')->fetch();
    if (!$row || !$row['prefs']) {
        return default_prefs();
    }
    $prefs = json_decode($row['prefs'], true);
    if (!is_array($prefs)) {
        return default_prefs();
    }
    return array_merge(default_prefs(), $prefs);
}

function prefs_save($data)
{
    if (!is_array($data)) {
        return;
    }
    $clean = array();
    if (array_key_exists('theme', $data)) {
        $theme = clean_text($data['theme'], 20);
        $clean['theme'] = in_array($theme, array('dark', 'light', 'system'), true) ? $theme : 'dark';
    }
    if (array_key_exists('autoStart', $data)) {
        $clean['autoStart'] = (bool) $data['autoStart'];
    }
    if (!$clean) {
        $clean = default_prefs();
    } else {
        $clean = array_merge(prefs_out(), $clean);
    }

    db()->prepare('UPDATE app_state SET prefs = ?, updated_at = ? WHERE id = 1')
        ->execute(array(json_encode($clean), now_ms()));
}

function app_state_row()
{
    $row = db()->query('SELECT * FROM app_state WHERE id = 1')->fetch();
    if (!$row) {
        ensure_default_rows();
        $row = db()->query('SELECT * FROM app_state WHERE id = 1')->fetch();
    }
    return $row;
}

function day_out($row = null)
{
    if ($row === null) {
        $row = app_state_row();
    }
    return array(
        'open'     => (bool) ((int) $row['day_open']),
        'openedAt' => (int) $row['day_opened_at'],
        'closedAt' => $row['day_closed_at'] === null ? null : (int) $row['day_closed_at'],
    );
}

function state_out($row = null)
{
    if ($row === null) {
        $row = app_state_row();
    }
    return array(
        'seq'      => (int) $row['seq'],
        'counter'  => $row['counter'],
        'day'      => day_out($row),
    );
}

function record_day_session($openedAt, $closedAt)
{
    $openedAt = (int) $openedAt;
    $closedAt = (int) $closedAt;
    if ($openedAt <= 0 || $closedAt <= 0) {
        return;
    }
    $stmt = db()->prepare('SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total, COALESCE(SUM(paid),0) AS paid, COALESCE(SUM(profit),0) AS profit
        FROM bills WHERE ts >= ? AND ts <= ?');
    $stmt->execute(array($openedAt, $closedAt));
    $row = $stmt->fetch();

    $user = current_user();
    $stmt = db()->prepare('INSERT INTO day_sessions (opened_at, closed_at, cashier, bill_count, total, paid, profit)
        VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute(array(
        $openedAt,
        $closedAt,
        $user ? $user['username'] : '',
        (int) $row['n'],
        round((float) $row['total'], 2),
        round((float) $row['paid'], 2),
        round((float) $row['profit'], 2),
    ));
}

/* ---------------- items ---------------- */

function item_out($r)
{
    return array(
        'id'        => $r['id'],
        'name'      => $r['name'],
        'category'  => $r['category'],
        'unit'      => $r['unit'],
        'cost'      => (float) $r['cost'],
        'price'     => (float) $r['price'],
        'qty'       => (float) $r['qty'],
        'reorder'   => (float) $r['reorder'],
        'active'    => (bool) ((int) $r['active']),
        'createdAt' => (int) $r['created_at'],
    );
}

function fetch_items()
{
    $out = array();
    $rows = db()->query('SELECT * FROM items ORDER BY created_at DESC, name ASC')->fetchAll();
    foreach ($rows as $row) {
        $out[] = item_out($row);
    }
    return $out;
}

function item_by_id($id)
{
    $stmt = db()->prepare('SELECT * FROM items WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    $row = $stmt->fetch();
    return $row ? item_out($row) : null;
}

function item_apply($data, $existing = null)
{
    $name = clean_text(arr($data, 'name', $existing ? $existing['name'] : ''), 160);
    if ($name === '') {
        throw new ApiException('Item name is required.', 422);
    }

    $item = array(
        'name'     => $name,
        'category' => clean_text(arr($data, 'category', $existing ? $existing['category'] : 'General'), 80),
        'unit'     => clean_text(arr($data, 'unit', $existing ? $existing['unit'] : 'pcs'), 16),
        'cost'     => money_value(arr($data, 'cost', $existing ? $existing['cost'] : 0)),
        'price'    => money_value(arr($data, 'price', $existing ? $existing['price'] : 0)),
        'qty'      => round(num_value(arr($data, 'qty', $existing ? $existing['qty'] : 0), 0, 999999999), 3),
        'reorder'  => round(num_value(arr($data, 'reorder', $existing ? $existing['reorder'] : 0), 0, 999999999), 3),
    );
    if ($item['category'] === '') {
        $item['category'] = 'General';
    }
    if ($item['unit'] === '') {
        $item['unit'] = 'pcs';
    }
    return $item;
}

function item_create($data)
{
    $id = arr($data, 'id');
    if (!valid_id($id)) {
        $id = rand_id('itm');
    }
    $item = item_apply($data);
    $now = now_ms();
    $createdAt = int_value(arr($data, 'createdAt', $now), 0, null, $now);

    $exists = db()->prepare('SELECT id FROM items WHERE id = ?');
    $exists->execute(array($id));
    if ($exists->fetch()) {
        throw new ApiException('That item already exists. Refresh and try again.', 409);
    }

    db()->prepare('INSERT INTO items (id, name, category, unit, cost, price, qty, reorder, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)')
        ->execute(array($id, $item['name'], $item['category'], $item['unit'], $item['cost'], $item['price'], $item['qty'], $item['reorder'], $createdAt, $now));

    audit('item.create', $item['name']);
    return item_by_id($id);
}

function item_update($id, $data)
{
    $existing = item_by_id($id);
    if (!$existing) {
        throw new ApiException('Item not found. Refresh and try again.', 404);
    }
    $item = item_apply($data, $existing);
    db()->prepare('UPDATE items SET name = ?, category = ?, unit = ?, cost = ?, price = ?, qty = ?, reorder = ?, updated_at = ? WHERE id = ?')
        ->execute(array($item['name'], $item['category'], $item['unit'], $item['cost'], $item['price'], $item['qty'], $item['reorder'], now_ms(), $id));

    audit('item.update', $item['name']);
    return item_by_id($id);
}

function item_set_active($id, $active)
{
    $item = item_by_id($id);
    if (!$item) {
        throw new ApiException('Item not found.', 404);
    }
    db()->prepare('UPDATE items SET active = ?, updated_at = ? WHERE id = ?')
        ->execute(array($active ? 1 : 0, now_ms(), $id));
    audit($active ? 'item.restore' : 'item.delete', $item['name']);
    return item_by_id($id);
}

function item_set_qty($id, $qty)
{
    $item = item_by_id($id);
    if (!$item) {
        throw new ApiException('Item not found.', 404);
    }
    $qty = round(num_value($qty, 0, 999999999), 3);
    db()->prepare('UPDATE items SET qty = ?, updated_at = ? WHERE id = ?')->execute(array($qty, now_ms(), $id));
    audit('item.stock', $item['name'] . ' -> ' . fmt_qty($qty));
    return item_by_id($id);
}

/* ---------------- customers ---------------- */

function customer_out($r)
{
    return array(
        'id'        => $r['id'],
        'name'      => $r['name'],
        'phone'     => $r['phone'],
        'address'   => $r['address'],
        'note'      => isset($r['note']) && $r['note'] !== null ? $r['note'] : '',
        'createdAt' => (int) $r['created_at'],
    );
}

function fetch_customers()
{
    $out = array();
    $rows = db()->query('SELECT * FROM customers ORDER BY created_at DESC, name ASC')->fetchAll();
    foreach ($rows as $row) {
        $out[] = customer_out($row);
    }
    return $out;
}

function customer_by_id($id)
{
    $stmt = db()->prepare('SELECT * FROM customers WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    $row = $stmt->fetch();
    return $row ? customer_out($row) : null;
}

function customer_create($data)
{
    $id = arr($data, 'id');
    if (!valid_id($id)) {
        $id = rand_id('cus');
    }
    $name = clean_text(arr($data, 'name'), 160);
    if ($name === '') {
        throw new ApiException('Customer name is required.', 422);
    }

    $exists = db()->prepare('SELECT id FROM customers WHERE id = ?');
    $exists->execute(array($id));
    if ($exists->fetch()) {
        throw new ApiException('That customer already exists. Refresh and try again.', 409);
    }

    $now = now_ms();
    $createdAt = int_value(arr($data, 'createdAt', $now), 0, null, $now);
    db()->prepare('INSERT INTO customers (id, name, phone, address, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute(array($id, $name, clean_text(arr($data, 'phone'), 60), clean_text(arr($data, 'address'), 255), clean_text(arr($data, 'note'), 1000), $createdAt, $now));

    audit('customer.create', $name);
    return customer_by_id($id);
}

function customer_update($id, $data)
{
    $existing = customer_by_id($id);
    if (!$existing) {
        throw new ApiException('Customer not found. Refresh and try again.', 404);
    }
    $name = clean_text(arr($data, 'name', $existing['name']), 160);
    if ($name === '') {
        throw new ApiException('Customer name is required.', 422);
    }
    db()->prepare('UPDATE customers SET name = ?, phone = ?, address = ?, note = ?, updated_at = ? WHERE id = ?')
        ->execute(array(
            $name,
            clean_text(arr($data, 'phone', $existing['phone']), 60),
            clean_text(arr($data, 'address', $existing['address']), 255),
            clean_text(arr($data, 'note', $existing['note']), 1000),
            now_ms(),
            $id,
        ));

    audit('customer.update', $name);
    return customer_by_id($id);
}

function customer_delete($id)
{
    $existing = customer_by_id($id);
    if (!$existing) {
        throw new ApiException('Customer not found.', 404);
    }
    db()->prepare('DELETE FROM customers WHERE id = ?')->execute(array($id));
    audit('customer.delete', $existing['name']);
    return true;
}

/* ---------------- bills ---------------- */

function bill_out($r, $lines)
{
    return array(
        'id'           => $r['id'],
        'no'           => $r['no'],
        'ts'           => (int) $r['ts'],
        'cashier'      => $r['cashier'],
        'customerId'   => $r['customer_id'],
        'customerName' => $r['customer_name'],
        'lines'        => $lines,
        'subtotal'     => (float) $r['subtotal'],
        'discount'     => (float) $r['discount'],
        'total'        => (float) $r['total'],
        'paid'         => (float) $r['paid'],
        'balance'      => (float) $r['balance'],
        'profit'       => (float) $r['profit'],
        'method'       => $r['method'],
        'bankName'     => $r['bank_name'],
        'chequeNo'     => $r['cheque_no'],
        'note'         => $r['note'],
    );
}

function line_out($r)
{
    return array(
        'itemId'   => $r['item_id'],
        'name'     => $r['name'],
        'unit'     => $r['unit'],
        'price'    => (float) $r['price'],
        'cost'     => (float) $r['cost'],
        'qty'      => (float) $r['qty'],
        /* stock_qty is 0 (NOT NULL) for bills created before this column existed,
           so fall back to `qty` when stock_qty is not a positive converted value. */
        'stockQty' => (float) ((!empty($r['stock_qty']) ? $r['stock_qty'] : $r['qty'])),
    );
}

function fetch_bills()
{
    $pdo = db();
    $linesByBill = array();
    foreach ($pdo->query('SELECT * FROM bill_lines ORDER BY id ASC') as $line) {
        $linesByBill[$line['bill_id']][] = line_out($line);
    }

    $out = array();
    foreach ($pdo->query('SELECT * FROM bills ORDER BY ts ASC, id ASC') as $row) {
        $out[] = bill_out($row, isset($linesByBill[$row['id']]) ? $linesByBill[$row['id']] : array());
    }
    return $out;
}

function bill_by_id($id)
{
    $stmt = db()->prepare('SELECT * FROM bills WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    $stmt = db()->prepare('SELECT * FROM bill_lines WHERE bill_id = ? ORDER BY id ASC');
    $stmt->execute(array($id));
    $lines = array();
    foreach ($stmt->fetchAll() as $line) {
        $lines[] = line_out($line);
    }
    return bill_out($row, $lines);
}

function bill_create($data, $user)
{
    $lines = arr($data, 'lines');
    if (!is_array($lines) || !count($lines)) {
        throw new ApiException('Add at least one item to the bill.', 422);
    }
    if (count($lines) > 200) {
        throw new ApiException('Too many lines on one bill.', 422);
    }

    $merged = array();
    foreach ($lines as $line) {
        if (!is_array($line)) {
            continue;
        }
        $itemId = arr($line, 'itemId');
        if (!is_string($itemId) || $itemId === '') {
            throw new ApiException('A bill line is missing its item.', 422);
        }
        $qty = round(num_value(arr($line, 'qty'), 0, 999999999), 3);
        if ($qty <= 0) {
            throw new ApiException('Quantity must be greater than zero.', 422);
        }
        if (isset($merged[$itemId])) {
            $entry     = $merged[$itemId];
            $entryUnit = strtolower((string) ($entry['unit'] ?? 'pcs'));
            $lineUnit  = strtolower((string) ($line['unit'] ?? 'pcs'));
            if ($lineUnit === '') {
                $lineUnit = 'pcs';
            }
            if ($lineUnit === $entryUnit) {
                $entry['qty'] = round($entry['qty'] + $qty, 3);
            } else {
                /* Same item sold in two compatible units (e.g. 1 kg + 500 g):
                   fold the new quantity into the first line's unit. */
                $factor = unit_ratio($lineUnit, $entryUnit);
                if ($factor === null) {
                    throw new ApiException('"' . $itemId . '" appears on the bill in two units that do not match (' .
                        $entryUnit . ' vs ' . $lineUnit . ').', 422);
                }
                $entry['qty'] = round($entry['qty'] + round($qty * $factor, 6), 3);
            }
            $merged[$itemId] = $entry;
        } else {
            $unit = strtolower(clean_text((string) ($line['unit'] ?? ''), 12));
            if ($unit === '') {
                $unit = 'pcs';
            }
            $merged[$itemId] = array(
                'itemId' => $itemId,
                'qty'    => $qty,
                'unit'   => $unit,
                'price'  => money_value(arr($line, 'price')),
                'cost'   => money_value(arr($line, 'cost')),
            );
        }
    }
    if (!count($merged)) {
        throw new ApiException('Add at least one item to the bill.', 422);
    }

    $customerId = arr($data, 'customerId');
    $customerId = ($customerId === null || $customerId === '') ? null : (string) $customerId;
    $customer = $customerId !== null ? customer_by_id($customerId) : null;
    if ($customerId !== null && !$customer) {
        throw new ApiException('That customer no longer exists. Choose the customer again.', 422);
    }

    $method = clean_text(arr($data, 'method', 'Cash'), 20);
    if (!in_array($method, array('Cash', 'Card', 'Bank', 'Cheque', 'Credit'), true)) {
        $method = 'Cash';
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $state = $pdo->query('SELECT * FROM app_state WHERE id = 1 FOR UPDATE')->fetch();
        if (!$state) {
            throw new ApiException('Application state is missing. Re-run install.php.', 500);
        }
        $seq = (int) $state['seq'];
        $billNo = 'WF-' . $seq;

        // Lock the item rows and read authoritative stock.
        $ids = array_keys($merged);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare('SELECT * FROM items WHERE id IN (' . $placeholders . ') FOR UPDATE');
        $stmt->execute($ids);
        $items = array();
        foreach ($stmt->fetchAll() as $row) {
            $items[$row['id']] = $row;
        }

        $cleanLines = array();
        $subtotal = 0.0;
        $profit = 0.0;

        foreach ($merged as $itemId => $line) {
            if (!isset($items[$itemId])) {
                throw new ApiException('One of the items no longer exists. Refresh and try again.', 409);
            }
            $dbItem = $items[$itemId];

            $stockUnit   = strtolower((string) $dbItem['unit']);
            $sellingUnit = strtolower((string) ($line['unit'] ?? 'pcs'));
            if ($sellingUnit === '') {
                $sellingUnit = 'pcs';
            }

            /* Convert the sold quantity to the item's stock unit.
               Example: stock kept in kg, sold in g → 500 g = 0.5 kg stock. */
            $stockQty = qty_to_stock_unit($line['qty'], $sellingUnit, $stockUnit);
            if ($stockQty === null) {
                throw new ApiException('Cannot sell "' . $dbItem['name'] . '" in ' . $sellingUnit .
                    ' — its stock is kept in ' . $stockUnit . '.', 422);
            }
            if ((float) $dbItem['qty'] < $stockQty) {
                throw new ApiException('Not enough stock for ' . $dbItem['name'] .
                    ' (only ' . fmt_qty((float) $dbItem['qty']) . ' ' . $stockUnit . ' left).', 409);
            }

            /* Price/cost per selling unit. Stock price is per stock unit.
               ratio = sellingUnit / stockUnit (e.g. g/kg = 0.001). */
            $ratio = unit_ratio($sellingUnit, $stockUnit);
            $price = $line['price'] > 0 ? $line['price'] : round((float) $dbItem['price'] * $ratio, 4);
            $cost  = $line['cost']  > 0 ? $line['cost']  : round((float) $dbItem['cost']  * $ratio, 4);

            $lineTotal = round($price * $line['qty'], 2);
            $subtotal += $lineTotal;
            $profit += round(($price - $cost) * $line['qty'], 2);

            $cleanLines[] = array(
                'itemId'   => $itemId,
                'name'     => $dbItem['name'],
                'unit'     => $sellingUnit,
                'price'    => round($price, 2),
                'cost'     => round($cost, 2),
                'qty'      => $line['qty'],
                'stockQty' => $stockQty,
            );
        }

        $subtotal = round($subtotal, 2);
        $discount = round(min(money_value(arr($data, 'discount')), $subtotal), 2);
        $total = round($subtotal - $discount, 2);
        $paid = money_value(arr($data, 'paid'));
        $balance = round(max(0, $total - $paid), 2);
        $profit = round($profit - $discount, 2);

        $billId = rand_id('bill');
        $ts = now_ms();
        $customerName = $customer ? $customer['name'] : 'Walk-in customer';

        $pdo->prepare('INSERT INTO bills
            (id, no, ts, cashier, customer_id, customer_name, subtotal, discount, total, paid, balance, profit,
             method, bank_name, cheque_no, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute(array(
                $billId, $billNo, $ts, $user['username'], $customer ? $customer['id'] : null, $customerName,
                $subtotal, $discount, $total, $paid, $balance, $profit,
                $method,
                clean_text(arr($data, 'bankName'), 80),
                clean_text(arr($data, 'chequeNo'), 40),
                clean_text(arr($data, 'note'), 255),
                $ts,
            ));

        $insertLine = $pdo->prepare('INSERT INTO bill_lines (bill_id, item_id, name, unit, price, cost, qty, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $takeStock = $pdo->prepare('UPDATE items SET qty = ROUND(qty - ?, 3), updated_at = ? WHERE id = ?');
        foreach ($cleanLines as $line) {
            $insertLine->execute(array($billId, $line['itemId'], $line['name'], $line['unit'], $line['price'], $line['cost'], $line['qty'], $line['stockQty']));
            $takeStock->execute(array($line['stockQty'], $ts, $line['itemId']));
        }

        $pdo->prepare('UPDATE app_state SET seq = ?, updated_at = ? WHERE id = 1')->execute(array($seq + 1, $ts));

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    audit('bill.create', $billNo . ' · ' . number_format($total, 2));
    return array('bill' => bill_by_id($billId), 'seq' => $seq + 1);
}

function bill_pay($id, $amount)
{
    $bill = bill_by_id($id);
    if (!$bill) {
        throw new ApiException('Bill not found.', 404);
    }
    $amount = money_value($amount);
    if ($amount <= 0) {
        throw new ApiException('Enter an amount greater than zero.', 422);
    }

    $paid = round(min((float) $bill['total'], (float) $bill['paid'] + $amount), 2);
    $balance = round(max(0, (float) $bill['total'] - $paid), 2);
    db()->prepare('UPDATE bills SET paid = ?, balance = ? WHERE id = ?')->execute(array($paid, $balance, $id));

    audit('bill.pay', $bill['no'] . ' · ' . number_format($amount, 2));
    return bill_by_id($id);
}

function bill_delete($ids)
{
    if (!is_array($ids) || !count($ids)) {
        throw new ApiException('No bills selected.', 422);
    }
    $ids = array_values(array_unique(array_filter($ids, function ($v) {
        return is_string($v) && $v !== '' && strlen($v) <= 40;
    })));
    if (!count($ids)) {
        throw new ApiException('No valid bills selected.', 422);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare('SELECT id, no FROM bills WHERE id IN (' . $placeholders . ')');
        $stmt->execute($ids);
        $bills = $stmt->fetchAll();
        if (!count($bills)) {
            throw new ApiException('Those bills no longer exist.', 404);
        }

        /* Restore stock in the item's stock unit. Prefer stock_qty (converted
           qty); fall back to qty for bills created before this column existed. */
        $lineStmt = $pdo->prepare('SELECT item_id, COALESCE(NULLIF(stock_qty, 0), qty) AS stock_qty FROM bill_lines WHERE bill_id = ?');
        $restore = $pdo->prepare('UPDATE items SET qty = ROUND(qty + ?, 3), updated_at = ? WHERE id = ?');
        $now = now_ms();
        foreach ($bills as $bill) {
            $lineStmt->execute(array($bill['id']));
            foreach ($lineStmt->fetchAll() as $line) {
                $restore->execute(array($line['stock_qty'], $now, $line['item_id']));
            }
        }

        $del = $pdo->prepare('DELETE FROM bills WHERE id IN (' . $placeholders . ')');
        $del->execute($ids);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    audit('bill.delete', count($bills) . ' bill(s)');
    return array('deleted' => count($bills));
}

function bill_clear_all()
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $count = (int) $pdo->query('SELECT COUNT(*) AS n FROM bills')->fetch()['n'];
        $pdo->exec('DELETE FROM bills');
        $pdo->prepare('UPDATE app_state SET seq = 1001, updated_at = ? WHERE id = 1')->execute(array(now_ms()));
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    audit('bill.clear', $count . ' bill(s)');
    return array('deleted' => $count);
}

/* ---------------- snapshots ---------------- */

function snapshot_out($user = null)
{
    $row = app_state_row();
    $state = state_out($row);
    $snapshot = array(
        'v'         => 2,
        'createdAt' => now_ms(),
        'shop'      => shop_out(),
        'prefs'     => prefs_out(),
        'day'       => $state['day'],
        'counters'  => array('counter' => $state['counter']),
        'seq'       => $state['seq'],
        'auth'      => array(
            'username'  => $user ? $user['username'] : '',
            'isDefault' => $user ? (bool) ((int) $user['must_change']) : false,
        ),
        'items'     => array(),
        'customers' => array(),
        'bills'     => array(),
    );

    if ($user) {
        $snapshot['items'] = fetch_items();
        $snapshot['customers'] = fetch_customers();
        $snapshot['bills'] = fetch_bills();
    }

    return $snapshot;
}

function bootstrap_out($user = null)
{
    return array(
        'authed' => (bool) $user,
        'csrf'   => csrf_token(),
        'user'   => $user ? array(
            'username'  => $user['username'],
            'isDefault' => (bool) ((int) $user['must_change']),
        ) : null,
        'db'     => snapshot_out($user),
        'version' => app_version(),
    );
}

/* ---------------- restore / reset ---------------- */

function backup_import($snapshot)
{
    if (!is_array($snapshot)) {
        throw new ApiException('That file does not look like an Austerra POS backup.', 422);
    }

    $items = arr($snapshot, 'items');
    $customers = arr($snapshot, 'customers');
    $bills = arr($snapshot, 'bills');
    if (!is_array($items) || !is_array($customers) || !is_array($bills)) {
        throw new ApiException('That file does not look like an Austerra POS backup.', 422);
    }
    if (count($items) > 20000 || count($customers) > 20000 || count($bills) > 100000) {
        throw new ApiException('That backup is too large to import on this plan.', 413);
    }

    $pdo = db();
    $now = now_ms();

    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM bills');
        $pdo->exec('DELETE FROM customers');
        $pdo->exec('DELETE FROM items');
        $pdo->exec('DELETE FROM day_sessions');

        /* ---- items ---- */
        $usedItemIds = array();
        $insertItem = $pdo->prepare('INSERT INTO items (id, name, category, unit, cost, price, qty, reorder, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($items as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $name = clean_text(arr($raw, 'name'), 160);
            if ($name === '') {
                continue;
            }
            $id = arr($raw, 'id');
            if (!valid_id($id) || isset($usedItemIds[$id])) {
                $id = rand_id('itm');
            }
            $usedItemIds[$id] = true;
            $insertItem->execute(array(
                $id,
                $name,
                clean_text(arr($raw, 'category', 'General'), 80) ?: 'General',
                clean_text(arr($raw, 'unit', 'pcs'), 16) ?: 'pcs',
                money_value(arr($raw, 'cost')),
                money_value(arr($raw, 'price')),
                round(num_value(arr($raw, 'qty'), 0, 999999999), 3),
                round(num_value(arr($raw, 'reorder'), 0, 999999999), 3),
                arr($raw, 'active', true) === false ? 0 : 1,
                int_value(arr($raw, 'createdAt', $now), 0, null, $now),
                $now,
            ));
        }

        /* ---- customers ---- */
        $usedCustomerIds = array();
        $insertCustomer = $pdo->prepare('INSERT INTO customers (id, name, phone, address, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($customers as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $name = clean_text(arr($raw, 'name'), 160);
            if ($name === '') {
                continue;
            }
            $id = arr($raw, 'id');
            if (!valid_id($id) || isset($usedCustomerIds[$id])) {
                $id = rand_id('cus');
            }
            $usedCustomerIds[$id] = true;
            $insertCustomer->execute(array(
                $id,
                $name,
                clean_text(arr($raw, 'phone'), 60),
                clean_text(arr($raw, 'address'), 255),
                clean_text(arr($raw, 'note'), 1000),
                int_value(arr($raw, 'createdAt', $now), 0, null, $now),
                $now,
            ));
        }

        /* ---- bills ---- */
        $seq = int_value(arr($snapshot, 'seq', 1001), 1001, null, 1001);
        $usedBillIds = array();
        $usedBillNos = array();
        $insertBill = $pdo->prepare('INSERT INTO bills
            (id, no, ts, cashier, customer_id, customer_name, subtotal, discount, total, paid, balance, profit,
             method, bank_name, cheque_no, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $insertLine = $pdo->prepare('INSERT INTO bill_lines (bill_id, item_id, name, unit, price, cost, qty, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

        foreach ($bills as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $rawLines = arr($raw, 'lines');
            if (!is_array($rawLines) || !count($rawLines) || count($rawLines) > 500) {
                continue;
            }

            $id = arr($raw, 'id');
            if (!valid_id($id) || isset($usedBillIds[$id])) {
                $id = rand_id('bill');
            }
            $usedBillIds[$id] = true;

            $no = clean_text(arr($raw, 'no'), 40);
            if ($no === '' || isset($usedBillNos[$no])) {
                do {
                    $no = 'WF-' . $seq;
                    $seq++;
                } while (isset($usedBillNos[$no]));
            }
            $usedBillNos[$no] = true;
            if (preg_match('/^WF-(\d+)$/', $no, $m)) {
                $seq = max($seq, ((int) $m[1]) + 1);
            }

            $customerId = arr($raw, 'customerId');
            if (!is_string($customerId) || !isset($usedCustomerIds[$customerId])) {
                $customerId = null;
            }
            $customerName = clean_text(arr($raw, 'customerName'), 160);
            if ($customerName === '') {
                $customerName = 'Walk-in customer';
            }

            $method = clean_text(arr($raw, 'method', 'Cash'), 20);
            if (!in_array($method, array('Cash', 'Card', 'Bank', 'Cheque', 'Credit'), true)) {
                $method = 'Cash';
            }

            $ts = int_value(arr($raw, 'ts', $now), 0, null, $now) ?: $now;
            $subtotal = money_value(arr($raw, 'subtotal', arr($raw, 'total', 0)));
            $discount = money_value(arr($raw, 'discount'));
            $total = money_value(arr($raw, 'total', $subtotal));
            $paid = money_value(arr($raw, 'paid'));
            $balance = round(max(0, $total - $paid), 2);
            $profit = num_value(arr($raw, 'profit'), null, null, 0);
            $profit = round($profit, 2);

            $insertBill->execute(array(
                $id, $no, $ts, clean_text(arr($raw, 'cashier'), 64) ?: 'admin',
                $customerId, $customerName, $subtotal, $discount, $total, $paid, $balance, $profit,
                $method,
                clean_text(arr($raw, 'bankName'), 80),
                clean_text(arr($raw, 'chequeNo'), 40),
                clean_text(arr($raw, 'note'), 255),
                $ts,
            ));

            foreach ($rawLines as $line) {
                if (!is_array($line)) {
                    continue;
                }
                $insertLine->execute(array(
                    $id,
                    clean_text(arr($line, 'itemId'), 40),
                    clean_text(arr($line, 'name'), 160),
                    clean_text(arr($line, 'unit', 'pcs'), 16) ?: 'pcs',
                    money_value(arr($line, 'price')),
                    money_value(arr($line, 'cost')),
                    round(num_value(arr($line, 'qty'), 0, 999999999), 3),
                    round(num_value(arr($line, 'stockQty', arr($line, 'qty')), 0, 999999999), 3),
                ));
            }
        }

        /* ---- settings / state ---- */
        if (is_array(arr($snapshot, 'shop'))) {
            shop_save($snapshot['shop']);
        }
        if (is_array(arr($snapshot, 'prefs'))) {
            prefs_save($snapshot['prefs']);
        }

        $day = arr($snapshot, 'day');
        $open = 1;
        $openedAt = $now;
        $closedAt = null;
        if (is_array($day)) {
            $open = !empty($day['open']) ? 1 : 0;
            $openedAt = int_value(arr($day, 'openedAt', $now), 0, null, $now) ?: $now;
            $closedAt = arr($day, 'closedAt') === null ? null : int_value(arr($day, 'closedAt'), 0, null, 0);
        }

        $counter = '01';
        $counters = arr($snapshot, 'counters');
        if (is_array($counters)) {
            $counter = clean_text(arr($counters, 'counter', '01'), 12) ?: '01';
        }

        $pdo->prepare('UPDATE app_state SET seq = ?, counter = ?, day_open = ?, day_opened_at = ?, day_closed_at = ?, updated_at = ? WHERE id = 1')
            ->execute(array($seq, $counter, $open, $openedAt, $closedAt, $now));

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    audit('backup.import', count($items) . ' items, ' . count($bills) . ' bills');
    return snapshot_out(current_user());
}

function data_reset()
{
    $pdo = db();
    $now = now_ms();
    $defaults = default_shop();

    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM bills');
        $pdo->exec('DELETE FROM customers');
        $pdo->exec('DELETE FROM items');
        $pdo->exec('DELETE FROM day_sessions');

        $pdo->prepare('UPDATE shop SET name = ?, legal_name = ?, tagline = ?, address = ?, phone = ?, email = ?,
                currency = ?, target = ?, bill_printer = ?, bill_paper = ?, report_paper = ?, updated_at = ? WHERE id = 1')
            ->execute(array(
                $defaults['name'], $defaults['legalName'], $defaults['tagline'], $defaults['address'],
                $defaults['phone'], $defaults['email'], $defaults['currency'], $defaults['target'],
                $defaults['billPrinter'], $defaults['billPaper'], $defaults['reportPaper'], $now,
            ));

        $pdo->prepare('UPDATE app_state SET seq = 1001, counter = ?, day_open = 1, day_opened_at = ?, day_closed_at = NULL, prefs = ?, updated_at = ? WHERE id = 1')
            ->execute(array('01', $now, json_encode(default_prefs()), $now));

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    audit('data.reset', 'Factory reset');
    return snapshot_out(current_user());
}
