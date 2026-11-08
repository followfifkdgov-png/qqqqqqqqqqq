<?php
/* ============================================================
   Austerra Agri Solutions POS - JSON API
   All data lives in MySQL. Every write is authenticated,
   CSRF-protected and validated on the server.
   ============================================================ */

require_once __DIR__ . '/lib/app.php';

try {
    require_once __DIR__ . '/lib/auth.php';
    require_once __DIR__ . '/lib/data.php';

    $action = isset($_GET['action']) ? (string) $_GET['action'] : '';
    $method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper($_SERVER['REQUEST_METHOD']) : 'GET';

    if (app_config() === null) {
        json_fail('Application is not configured.', 503);
    }

    if (!is_installed()) {
        json_fail('The application is not installed yet. Open install.php in your browser.', 503);
    }

    /* Public actions -------------------------------------------------- */

    if ($action === 'bootstrap') {
        start_session();
        ensure_default_rows();
        $user = current_user();
        json_ok(bootstrap_out($user));
    }

    if ($action === 'health') {
        $dbOk = false;
        try {
            db()->query('SELECT 1');
            $dbOk = true;
        } catch (Throwable $e) {
            $dbOk = false;
        }
        json_ok(array(
            'installed' => is_installed(),
            'database'  => $dbOk,
            'php'       => PHP_VERSION,
            'version'   => app_version(),
            'time'      => now_ms(),
        ));
    }

    if ($action === 'auth.login') {
        if ($method !== 'POST') {
            json_fail('Use POST for this action.', 405);
        }
        require_csrf();
        $body = body_json();
        $user = login_user(arr($body, 'username'), arr($body, 'password'));
        json_ok(bootstrap_out($user));
    }

    if ($action === 'auth.logout') {
        if ($method !== 'POST') {
            json_fail('Use POST for this action.', 405);
        }
        require_csrf();
        logout_user();
        json_ok(bootstrap_out(null));
    }

    /* Authenticated actions ------------------------------------------ */

    $user = require_auth();

    if ($method !== 'GET') {
        require_csrf();
    }

    switch ($action) {

        case 'auth.changePassword': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            $current = is_string(arr($body, 'current')) ? $body['current'] : '';
            $next = is_string(arr($body, 'next')) ? $body['next'] : '';

            if ($next === '' || strlen($next) < 6) {
                throw new ApiException('New password must be at least 6 characters.', 422);
            }
            if (strlen($next) > 72) {
                throw new ApiException('New password is too long (maximum 72 characters).', 422);
            }

            $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
            $stmt->execute(array((int) $user['id']));
            $row = $stmt->fetch();
            if (!$row || !password_verify($current, $row['password_hash'])) {
                throw new ApiException('Current password is not correct.', 403);
            }

            db()->prepare('UPDATE users SET password_hash = ?, must_change = 0, updated_at = ? WHERE id = ?')
                ->execute(array(password_hash($next, PASSWORD_DEFAULT), now_ms(), (int) $user['id']));

            session_regenerate_id(true);
            audit('password.change', 'Password updated');
            json_ok(array('changed' => true));
        }

        case 'state.save': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(state_save($body));
        }

        case 'item.create': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(array('item' => item_create($body)));
        }

        case 'item.update': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            $id = arr($body, 'id');
            if (!is_string($id) || $id === '') {
                throw new ApiException('Item id is required.', 422);
            }
            json_ok(array('item' => item_update($id, arr($body, 'item', array()))));
        }

        case 'item.delete': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(array('item' => item_set_active((string) arr($body, 'id'), false)));
        }

        case 'item.restore': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(array('item' => item_set_active((string) arr($body, 'id'), true)));
        }

        case 'item.setQty': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(array('item' => item_set_qty((string) arr($body, 'id'), arr($body, 'qty', 0))));
        }

        case 'customer.create': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(array('customer' => customer_create($body)));
        }

        case 'customer.update': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            $id = arr($body, 'id');
            if (!is_string($id) || $id === '') {
                throw new ApiException('Customer id is required.', 422);
            }
            json_ok(array('customer' => customer_update($id, arr($body, 'customer', array()))));
        }

        case 'customer.delete': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            customer_delete((string) arr($body, 'id'));
            json_ok(array('deleted' => true));
        }

        case 'bill.create': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(bill_create($body, $user));
        }

        case 'bill.pay': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(array('bill' => bill_pay((string) arr($body, 'id'), arr($body, 'amount'))));
        }

        case 'bill.delete': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            json_ok(bill_delete(arr($body, 'ids')));
        }

        case 'bill.clearAll': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            json_ok(bill_clear_all());
        }

        case 'backup.export': {
            json_ok(snapshot_out($user));
        }

        case 'backup.import': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            $body = body_json();
            $snapshot = arr($body, 'snapshot');
            json_ok(array('db' => backup_import($snapshot)));
        }

        case 'data.reset': {
            if ($method !== 'POST') {
                json_fail('Use POST for this action.', 405);
            }
            json_ok(array('db' => data_reset()));
        }

        default:
            throw new ApiException('Unknown action.', 404);
    }
} catch (ApiException $e) {
    json_fail($e->getMessage(), $e->status >= 400 ? $e->status : 400);
} catch (PDOException $e) {
    app_log('PDO error: ' . $e->getMessage());
    json_fail('The database could not complete that request. Please try again. If it keeps happening, check the MySQL user permissions in DirectAdmin.', 500);
} catch (Throwable $e) {
    app_log('API error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    json_fail('Something went wrong on the server. Please try again.', 500);
}

/* ---------------- state save (shop, prefs, day, seq) ---------------- */

function state_save($data)
{
    if (!is_array($data)) {
        throw new ApiException('Invalid settings payload.', 422);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $row = $pdo->query('SELECT * FROM app_state WHERE id = 1 FOR UPDATE')->fetch();
        if (!$row) {
            throw new ApiException('Application state is missing. Re-run install.php.', 500);
        }

        $oldOpen = (int) $row['day_open'];
        $oldOpenedAt = (int) $row['day_opened_at'];

        if (isset($data['shop']) && is_array($data['shop'])) {
            shop_save($data['shop']);
        }
        if (isset($data['prefs']) && is_array($data['prefs'])) {
            prefs_save($data['prefs']);
        }

        $newOpen = $oldOpen;
        $openedAt = $oldOpenedAt;
        $closedAt = $row['day_closed_at'] === null ? null : (int) $row['day_closed_at'];

        if (isset($data['day']) && is_array($data['day'])) {
            $day = $data['day'];
            $newOpen = !empty($day['open']) ? 1 : 0;
            $openedAt = int_value(arr($day, 'openedAt', $oldOpenedAt), 0, null, $oldOpenedAt);
            if ($openedAt <= 0) {
                $openedAt = now_ms();
            }
            if (array_key_exists('closedAt', $day)) {
                $closedAt = $day['closedAt'] === null ? null : int_value($day['closedAt'], 0, null, 0);
            }
            if ($newOpen) {
                $closedAt = null;
            }
        }

        $seq = isset($data['seq']) ? int_value($data['seq'], 1, 4294967295, (int) $row['seq']) : (int) $row['seq'];
        // Never move the bill sequence backwards by accident (an old tab could send a stale value).
        $seq = max((int) $row['seq'], $seq);

        $counter = isset($data['counters']) && is_array($data['counters'])
            ? clean_text(arr($data['counters'], 'counter', $row['counter']), 12)
            : $row['counter'];
        if ($counter === '') {
            $counter = '01';
        }

        $pdo->prepare('UPDATE app_state SET seq = ?, counter = ?, day_open = ?, day_opened_at = ?, day_closed_at = ?, updated_at = ? WHERE id = 1')
            ->execute(array($seq, $counter, $newOpen, $openedAt, $closedAt, now_ms()));

        if ($oldOpen === 1 && $newOpen === 0) {
            record_day_session($oldOpenedAt, $closedAt ?: now_ms());
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return array(
        'seq'     => $seq,
        'counter' => $counter,
        'day'     => day_out(),
        'shop'    => shop_out(),
        'prefs'   => prefs_out(),
    );
}
