<?php
declare(strict_types=1);

function orderView(array $order): array {
    $rows=query('SELECT product_id AS id,name,price,currency,quantity FROM order_items WHERE order_id=? ORDER BY position',[$order['id']])->fetchAll();
    $totals=[];
    $items=array_map(function($row) use (&$totals) {
        $row['quantity']=(int)$row['quantity'];
        if ($row['price']!==null) {
            // Work in integer minor units; DECIMAL never passes through floating point for addition.
            $parts=explode('.',$row['price']);
            $minor=(int)$parts[0]*100+(int)str_pad($parts[1]??'',2,'0');
            $totals[$row['currency']]=($totals[$row['currency']]??0)+$minor*$row['quantity'];
            $row['price']=$minor/100;
        }
        return $row;
    },$rows);
    return ['id'=>$order['id'],'created'=>$order['created'],'items'=>$items,'totals'=>(object)array_map(fn($minor)=>$minor/100,$totals)];
}
function createOrder(string $userId): array {
    $key=$_SERVER['HTTP_IDEMPOTENCY_KEY']??'';
    if (!preg_match('/^[a-zA-Z0-9_-]{16,80}$/D',$key)) fail('Требуется ключ повторной отправки заказа. Обновите страницу.');
    return transaction(function () use ($userId,$key) {
        // Serialize selections and orders for this user; concurrent retries see the committed order.
        query('SELECT id FROM users WHERE id=? FOR UPDATE',[$userId]);
        $old=query('SELECT id,created FROM orders WHERE user_id=? AND idempotency_key=?',[$userId,$key])->fetch();
        if ($old) return ['order'=>orderView($old),'status'=>200];
        $items=query('SELECT p.id,p.name,p.price,p.currency,c.quantity,c.position FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY c.position',[$userId])->fetchAll();
        if (!$items) return ['error'=>'Добавьте мышь в корзину.'];
        $order=['id'=>uid(),'created'=>gmdate('Y-m-d\TH:i:s\Z')];
        query('INSERT INTO orders(id,user_id,created,idempotency_key) VALUES(?,?,?,?)',[$order['id'],$userId,$order['created'],$key]);
        foreach ($items as $item) query('INSERT INTO order_items(order_id,product_id,name,price,currency,quantity,position) VALUES(?,?,?,?,?,?,?)',[$order['id'],$item['id'],$item['name'],$item['price'],$item['currency'],$item['quantity'],$item['position']]);
        return ['order'=>orderView($order),'status'=>201];
    });
}
