<?php
declare(strict_types=1);

function authenticate(string $route, array $body): array {
    $email = strtolower(textField($body, 'email'));
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Укажите корректный email.');
    if (mb_strlen($password) < 10 || mb_strlen($password) > 128 || str_contains($password, "\0")) fail('Пароль должен содержать от 10 до 128 символов.');
    $name = $route === 'register' ? validName($body) : '';
    $key = hash('sha256', $email . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'local'));
    // Lock both the email bucket and an IP-wide bucket so changing emails cannot bypass limits.
    $ipKey = hash('sha256', 'ip:' . ($_SERVER['REMOTE_ADDR'] ?? 'local'));
    $allowed = transaction(function () use ($key, $ipKey) {
        foreach ([$key => 10, $ipKey => 200] as $bucket => $limit) {
            query('INSERT IGNORE INTO auth_attempts(attempt_key,attempts,reset_at) VALUES(?,0,?)', [$bucket,time()+900]);
            $row = query('SELECT * FROM auth_attempts WHERE attempt_key=? FOR UPDATE', [$bucket])->fetch();
            if ($row['reset_at'] <= time()) {
                query('UPDATE auth_attempts SET attempts=0,reset_at=? WHERE attempt_key=?', [time()+900,$bucket]);
                $row['attempts'] = 0;
            }
            if ($row['attempts'] >= $limit) return false;
            query('UPDATE auth_attempts SET attempts=attempts+1 WHERE attempt_key=?', [$bucket]);
        }
        return true;
    });
    if (!$allowed) fail('Слишком много попыток. Повторите через 15 минут.',429);
    $user = query('SELECT * FROM users WHERE email=?', [$email])->fetch();
    // SHA-256 prehash avoids bcrypt's 72-byte truncation for long Unicode passwords.
    $secret = hash('sha256', $password);
    if ($route === 'register') {
        if ($user) fail('Аккаунт с этим email уже существует. Попробуйте войти.',409);
        $user = ['id'=>uid(),'name'=>$name,'email'=>$email];
        try { query('INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)', [$user['id'],$name,$email,password_hash($secret,PASSWORD_DEFAULT)]); }
        catch (PDOException $e) { if (($e->errorInfo[1] ?? null) === 1062) fail('Аккаунт с этим email уже существует.',409); throw $e; }
    } else {
        // Valid fixed-cost dummy hash prevents an unknown email from bypassing password work.
        $dummy = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        $matches = password_verify($secret, $user['password_hash'] ?? $dummy);
        if (!$user || !$matches) fail('Email или пароль не совпадают.',401);
    }
    query('DELETE FROM auth_attempts WHERE attempt_key=?',[$key]);
    $token = bin2hex(random_bytes(32));
    query('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',[hash('sha256',$token),$user['id'],time()+604800]);
    sessionCookie($token,time()+604800);
    return $user;
}
function currentUser(): array {
    $token = $_COOKIE['mouvra_session'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D',$token)) fail('Войдите в аккаунт, чтобы продолжить.',401);
    $user = query('SELECT u.id,u.name,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?',[hash('sha256',$token),time()])->fetch();
    if (!$user) fail('Войдите в аккаунт, чтобы продолжить.',401);
    return $user;
}
