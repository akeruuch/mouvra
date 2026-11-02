-- Read-only checks. Each expected-empty query should return no rows.
SELECT 'users' AS entity, COUNT(*) AS rows_count FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items;
SELECT user_id, product_id, COUNT(*) FROM cart_items GROUP BY user_id, product_id HAVING COUNT(*) > 1;
SELECT user_id, idempotency_key, COUNT(*) FROM orders GROUP BY user_id, idempotency_key HAVING COUNT(*) > 1;
SELECT c.user_id,c.product_id FROM cart_items c LEFT JOIN products p ON p.id=c.product_id WHERE p.id IS NULL;
SELECT order_id,currency,SUM(price*quantity) AS known_total, SUM(price IS NULL) AS unknown_price_lines
FROM order_items GROUP BY order_id,currency;
SELECT id FROM products WHERE price < 0;
SELECT order_id,product_id FROM order_items WHERE quantity NOT BETWEEN 1 AND 10;
