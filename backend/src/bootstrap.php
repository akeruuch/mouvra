<?php
declare(strict_types=1);

function db(): PDO {
    static $connection;
    if (!$connection) {
        $connection = new PDO('mysql:host=' . getenv('DB_HOST') . ';dbname=' . getenv('DB_NAME') . ';charset=utf8mb4', getenv('DB_USER'), getenv('DB_PASSWORD'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $connection->exec("SET time_zone = '+00:00'");
    }
    return $connection;
}
function query(string $sql, array $values = []): PDOStatement {
    $stmt = db()->prepare($sql);
    $stmt->execute($values);
    return $stmt;
}
function respond(array $body, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function fail(string $message, int $status = 400): never { respond(['error' => $message], $status); }
function uid(): string { return bin2hex(random_bytes(16)); }
function publicUser(array $user): array { return array_intersect_key($user, array_flip(['id','name','email'])); }
function textField(array $body, string $field): string { return is_string($body[$field] ?? null) ? trim($body[$field]) : ''; }
function validName(array $body): string {
    $name = textField($body, 'name');
    if (mb_strlen($name) < 2 || mb_strlen($name) > 60) fail('Имя должно содержать от 2 до 60 символов.');
    return $name;
}
function sessionCookie(string $token, int $expires): void {
    setcookie('mouvra_session', $token, ['expires' => $expires, 'path' => '/',
        'secure' => str_starts_with(getenv('APP_ORIGIN') ?: '', 'https://'), 'httponly' => true, 'samesite' => 'Lax']);
}
function transaction(callable $action): mixed {
    db()->beginTransaction();
    try { $result = $action(); db()->commit(); return $result; }
    catch (Throwable $e) { if (db()->inTransaction()) db()->rollBack(); throw $e; }
}
