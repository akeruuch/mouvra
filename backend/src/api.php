<?php
declare(strict_types=1);

// Входной обработчик PHP API.
// Читает адрес и JSON запроса, выбирает действие и возвращает JSON браузеру.

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/selection.php';
require_once __DIR__ . '/orders.php';

try {
  $route = substr(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), 5);
  $routes = [
    'health' => 'GET',
    'products' => 'GET',
    'reviews' => 'GET',
    'register' => 'POST',
    'login' => 'POST',
    'logout' => 'POST',
    'account' => 'GET',
    'profile' => 'PATCH',
    'state' => 'PUT',
    'orders' => 'POST',
  ];
  $reviewId = preg_match('#^reviews/[a-f0-9]{32}$#D', $route) ? substr($route, 8) : null;
  if (!isset($routes[$route]) && $reviewId === null) {
    fail('Этот адрес не найден.', 404);
  }
  $method = $_SERVER['REQUEST_METHOD'];
  if ($reviewId !== null) {
    if (!in_array($method, ['PATCH', 'DELETE'], true)) {
      header('Allow: PATCH, DELETE');
      fail('Метод не поддерживается.', 405);
    }
    $route = 'review';
  } elseif ($route === 'reviews') {
    if (!in_array($method, ['GET', 'POST'], true)) {
      header('Allow: GET, POST');
      fail('Метод не поддерживается.', 405);
    }
  } elseif ($method !== $routes[$route]) {
    header('Allow: ' . $routes[$route]);
    fail('Метод не поддерживается.', 405);
  }
  // Для изменяющих запросов проверяем источник, тип и размер тела, затем разбираем JSON.
  $body = [];
  if ($method !== 'GET') {
    if (($_SERVER['HTTP_ORIGIN'] ?? '') !== getenv('APP_ORIGIN')) {
      fail('Запрос отклонён. Обновите страницу.', 403);
    }
    if (
      strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !==
      'application/json'
    ) {
      fail('Ожидается application/json.', 415);
    }
    $raw = file_get_contents('php://input', false, null, 0, 16001);
    if (strlen($raw) > 16000) {
      fail('Слишком большой запрос.', 413);
    }
    try {
      $decoded = json_decode($raw, false, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
      fail('Некорректные данные.');
    }
    if (!is_object($decoded)) {
      fail('Ожидается JSON-объект.');
    }
    $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
  }
  // Проверка доступности API и наличия каталога.
  if ($route === 'health') {
    $count = (int) query('SELECT COUNT(*) FROM products')->fetchColumn();
    respond(
      [
        'status' => $count ? 'ok' : 'not_ready',
        'database' => 'mysql',
        'products' => $count,
      ],
      $count ? 200 : 503,
    );
  }
  // Публичная выдача каталога из MySQL.
  if ($route === 'products') {
    $rows = query('SELECT * FROM products ORDER BY position')->fetchAll();
    if (!$rows) {
      fail('Каталог ещё не загружен.', 503);
    }
    $products = array_map(function ($row) {
      $product = json_decode($row['details'], true, 32, JSON_THROW_ON_ERROR);
      $product['price']['amount'] = $row['price'] === null ? null : (float) $row['price'];
      $product['price']['currency'] = $row['currency'];
      return $product;
    }, $rows);
    respond([
      'products' => $products,
      'verifiedAt' => max(array_column($rows, 'verified_at')),
    ]);
  }
  // Отзывы: чтение доступно всем, запись — после проверки сессии.
  if ($route === 'reviews' && $method === 'GET') {
    $productId = is_string($_GET['productId'] ?? null) ? $_GET['productId'] : '';
    if (!query('SELECT id FROM products WHERE id=?', [$productId])->fetch()) {
      fail('Модель не найдена.', 404);
    }
    $rows = query(
      'SELECT r.id,r.user_id AS userId,u.name AS userName,r.product_id AS productId,r.rating,r.comment,r.created,r.updated FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? ORDER BY r.created DESC,r.id DESC LIMIT 200',
      [$productId],
    )->fetchAll();
    $count = count($rows);
    $average = $count ? round(array_sum(array_column($rows, 'rating')) / $count, 1) : 0.0;
    respond(['reviews' => $rows, 'average' => $average, 'count' => $count]);
  }
  // Регистрация и вход не требуют существующей сессии.
  if ($route === 'register' || $route === 'login') {
    $user = authenticate($route, $body);
    respond(
      ['user' => publicUser($user), 'state' => selection($user['id'])],
      $route === 'register' ? 201 : 200,
    );
  }
  // Все действия ниже требуют действующей сессии пользователя.
  $user = currentUser();
  if ($route === 'reviews' && $method === 'POST') {
    $productId = textField($body, 'productId');
    $rating = $body['rating'] ?? null;
    $comment = textField($body, 'comment');
    if (!query('SELECT id FROM products WHERE id=?', [$productId])->fetch()) {
      fail('Модель не найдена.', 404);
    }
    if (!is_int($rating) || $rating < 1 || $rating > 5) {
      fail('Оценка должна быть от 1 до 5.');
    }
    if (mb_strlen($comment) < 2 || mb_strlen($comment) > 2000) {
      fail('Комментарий должен содержать от 2 до 2000 символов.');
    }
    $id = uid();
    $now = gmdate('Y-m-d\TH:i:s\Z');
    try {
      query(
        'INSERT INTO reviews(id,user_id,product_id,rating,comment,created,updated) VALUES(?,?,?,?,?,?,?)',
        [$id, $user['id'], $productId, $rating, $comment, $now, $now],
      );
    } catch (PDOException $e) {
      if (($e->errorInfo[1] ?? null) === 1062) {
        fail('Вы уже оставили отзыв об этой модели.', 409);
      }
      throw $e;
    }
    respond(
      [
        'review' => [
          'id' => $id,
          'userId' => $user['id'],
          'userName' => $user['name'],
          'productId' => $productId,
          'rating' => $rating,
          'comment' => $comment,
          'created' => $now,
          'updated' => $now,
        ],
      ],
      201,
    );
  }
  // Выход: удаляем сессию из базы и cookie.
  if ($route === 'logout') {
    query('DELETE FROM sessions WHERE token=?', [
      hash('sha256', $_COOKIE['mouvra_session']),
    ]);
    sessionCookie('', time() - 3600);
    respond(['ok' => true]);
  }
  // Личный кабинет: профиль, корзина и сохранённые подборки.
  if ($route === 'account') {
    $result = transaction(function () use ($user) {
      return [
        'user' => publicUser($user),
        'state' => selection($user['id']),
        'orders' => array_map(
          'orderView',
          query(
            'SELECT id,created FROM orders WHERE user_id=? ORDER BY created DESC,id DESC LIMIT 50',
            [$user['id']],
          )->fetchAll(),
        ),
      ];
    });
    respond($result);
  }
  // Сохраняем корзину и избранное.
  if ($route === 'state') {
    respond(['state' => saveSelection($user['id'], $body)]);
  }
  // Изменяем имя текущего пользователя.
  if ($route === 'profile') {
    $user['name'] = validName($body);
    query('UPDATE users SET name=? WHERE id=?', [$user['name'], $user['id']]);
    respond(['user' => publicUser($user)]);
  }
  // Создаём снимок текущей корзины.
  if ($route === 'orders') {
    $result = createOrder($user['id']);
    if (isset($result['error'])) {
      fail($result['error']);
    }
    respond(['order' => $result['order']], $result['status']);
  }
  // Изменение и удаление: ищем отзыв одновременно по ID и автору.
  if ($route === 'review') {
    $id = $reviewId;
    $review = query('SELECT * FROM reviews WHERE id=? AND user_id=?', [
      $id,
      $user['id'],
    ])->fetch();
    if (!$review) {
      fail('Отзыв не найден.', 404);
    }
    if ($method === 'DELETE') {
      query('DELETE FROM reviews WHERE id=? AND user_id=?', [$id, $user['id']]);
      respond(['ok' => true]);
    }
    $rating = array_key_exists('rating', $body) ? $body['rating'] : $review['rating'];
    $comment = array_key_exists('comment', $body)
      ? textField($body, 'comment')
      : $review['comment'];
    if (!is_int($rating) || $rating < 1 || $rating > 5) {
      fail('Оценка должна быть от 1 до 5.');
    }
    if (mb_strlen($comment) < 2 || mb_strlen($comment) > 2000) {
      fail('Комментарий должен содержать от 2 до 2000 символов.');
    }
    $updated = gmdate('Y-m-d\TH:i:s\Z');
    query('UPDATE reviews SET rating=?,comment=?,updated=? WHERE id=? AND user_id=?', [
      $rating,
      $comment,
      $updated,
      $id,
      $user['id'],
    ]);
    respond([
      'review' => [
        'id' => $id,
        'userId' => $user['id'],
        'userName' => $user['name'],
        'productId' => $review['product_id'],
        'rating' => $rating,
        'comment' => $comment,
        'created' => $review['created'],
        'updated' => $updated,
      ],
    ]);
  }
} catch (Throwable $e) {
  error_log('MOUVRA API failure: ' . get_class($e));
  fail('Сервис временно недоступен. Попробуйте ещё раз.', 503);
}
