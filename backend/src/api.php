<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/auth.php';
require_once __DIR__.'/selection.php';
require_once __DIR__.'/orders.php';

try {
    $route=substr(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH),5);
    $routes=['health'=>'GET','products'=>'GET','register'=>'POST','login'=>'POST','logout'=>'POST','account'=>'GET','profile'=>'PATCH','state'=>'PUT','orders'=>'POST'];
    if (!isset($routes[$route])) fail('Этот адрес не найден.',404);
    $method=$_SERVER['REQUEST_METHOD'];
    if ($method!==$routes[$route]) {header('Allow: '.$routes[$route]);fail('Метод не поддерживается.',405);}
    $body=[];
    if ($method!=='GET') {
        if (($_SERVER['HTTP_ORIGIN']??'') !== getenv('APP_ORIGIN')) fail('Запрос отклонён. Обновите страницу.',403);
        if (strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE']??'')[0]))!=='application/json') fail('Ожидается application/json.',415);
        $raw=file_get_contents('php://input',false,null,0,16001);
        if (strlen($raw)>16000) fail('Слишком большой запрос.',413);
        try { $decoded=json_decode($raw,false,32,JSON_THROW_ON_ERROR); }
        catch (JsonException) {fail('Некорректные данные.');}
        if (!is_object($decoded)) fail('Ожидается JSON-объект.');
        $body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    }
    if ($route==='health') {
        $count=(int)query('SELECT COUNT(*) FROM products')->fetchColumn();
        respond(['status'=>$count?'ok':'not_ready','database'=>'mysql','products'=>$count],$count?200:503);
    }
    if ($route==='products') {
        $rows=query('SELECT * FROM products ORDER BY position')->fetchAll();
        if (!$rows) fail('Каталог ещё не загружен.',503);
        $products=array_map(function($row) {
            $product=json_decode($row['details'],true,32,JSON_THROW_ON_ERROR);
            $product['price']['amount']=$row['price']===null?null:(float)$row['price'];
            $product['price']['currency']=$row['currency'];
            return $product;
        },$rows);
        respond(['products'=>$products,'verifiedAt'=>max(array_column($rows,'verified_at'))]);
    }
    if ($route==='register'||$route==='login') {
        $user=authenticate($route,$body);
        respond(['user'=>publicUser($user),'state'=>selection($user['id'])],$route==='register'?201:200);
    }
    $user=currentUser();
    if ($route==='logout') {
        query('DELETE FROM sessions WHERE token=?',[hash('sha256',$_COOKIE['mouvra_session'])]);
        sessionCookie('',time()-3600);respond(['ok'=>true]);
    }
    if ($route==='account') {
        $result=transaction(function() use ($user) {
            return ['user'=>publicUser($user),'state'=>selection($user['id']),
                'orders'=>array_map('orderView',query('SELECT id,created FROM orders WHERE user_id=? ORDER BY created DESC,id DESC LIMIT 50',[$user['id']])->fetchAll())];
        });
        respond($result);
    }
    if ($route==='state') respond(['state'=>saveSelection($user['id'],$body)]);
    if ($route==='profile') {
        $user['name']=validName($body);
        query('UPDATE users SET name=? WHERE id=?',[$user['name'],$user['id']]);respond(['user'=>publicUser($user)]);
    }
    if ($route==='orders') {
        $result=createOrder($user['id']);
        if (isset($result['error'])) fail($result['error']);
        respond(['order'=>$result['order']],$result['status']);
    }
} catch (Throwable $e) {
    error_log('MOUVRA API failure: '.get_class($e));
    fail('Сервис временно недоступен. Попробуйте ещё раз.',503);
}
