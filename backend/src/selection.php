<?php
declare(strict_types=1);

function selection(string $userId): array {
    $cart = query('SELECT product_id AS id,quantity FROM cart_items WHERE user_id=? ORDER BY position',[$userId])->fetchAll();
    return ['cart'=>array_map(fn($r)=>['id'=>$r['id'],'quantity'=>(int)$r['quantity']],$cart),
        'favorites'=>query('SELECT product_id FROM favorites WHERE user_id=? ORDER BY position',[$userId])->fetchAll(PDO::FETCH_COLUMN)];
}
function saveSelection(string $userId, array $body): array {
    $ids = query('SELECT id FROM products')->fetchAll(PDO::FETCH_COLUMN);
    $cart = $body['cart'] ?? null; $favorites = $body['favorites'] ?? null;
    if (!is_array($cart) || !array_is_list($cart) || !is_array($favorites) || !array_is_list($favorites) || count($cart)>count($ids) || count($favorites)>count($ids)) fail('Некорректная подборка.');
    $seen=[];
    foreach ($cart as $line) {
        if (!is_array($line) || !is_string($line['id'] ?? null) || !in_array($line['id'],$ids,true) || isset($seen[$line['id']]) || !is_int($line['quantity'] ?? null) || $line['quantity']<1 || $line['quantity']>10) fail('Проверьте товары и количество: от 1 до 10 для каждой модели.');
        $seen[$line['id']]=true;
    }
    $seen=[];
    foreach ($favorites as $id) {
        if (!is_string($id) || !in_array($id,$ids,true) || isset($seen[$id])) fail('Некорректное избранное.');
        $seen[$id]=true;
    }
    return transaction(function () use ($userId,$cart,$favorites) {
        query('SELECT id FROM users WHERE id=? FOR UPDATE',[$userId]);
        query('DELETE FROM cart_items WHERE user_id=?',[$userId]);
        query('DELETE FROM favorites WHERE user_id=?',[$userId]);
        foreach ($cart as $position=>$line) query('INSERT INTO cart_items(user_id,product_id,quantity,position) VALUES(?,?,?,?)',[$userId,$line['id'],$line['quantity'],$position]);
        foreach ($favorites as $position=>$id) query('INSERT INTO favorites(user_id,product_id,position) VALUES(?,?,?)',[$userId,$id,$position]);
        return selection($userId);
    });
}
