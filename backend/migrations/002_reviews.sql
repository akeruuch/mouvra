CREATE TABLE IF NOT EXISTS reviews (
 id CHAR(32) PRIMARY KEY, user_id CHAR(32) NOT NULL, product_id VARCHAR(80) NOT NULL,
 rating TINYINT NOT NULL, comment VARCHAR(2000) NOT NULL,
 created VARCHAR(30) NOT NULL, updated VARCHAR(30) NOT NULL,
 UNIQUE KEY reviews_user_product_unique (user_id,product_id), INDEX (product_id,created),
 CHECK (rating BETWEEN 1 AND 5),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;
