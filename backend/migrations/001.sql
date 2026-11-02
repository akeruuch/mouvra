CREATE TABLE IF NOT EXISTS users (
 id CHAR(32) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
 name VARCHAR(60) NOT NULL, password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
 token CHAR(64) PRIMARY KEY, user_id CHAR(32) NOT NULL, expires BIGINT NOT NULL,
 INDEX (expires), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS auth_attempts (
 attempt_key CHAR(64) PRIMARY KEY, attempts INT NOT NULL, reset_at BIGINT NOT NULL,
 INDEX (reset_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS products (
 id VARCHAR(80) PRIMARY KEY, name VARCHAR(200) NOT NULL,
 price DECIMAL(12,2) NULL, currency CHAR(3) NOT NULL,
 details JSON NOT NULL, verified_at DATE NOT NULL, position INT NOT NULL,
 CHECK (price IS NULL OR price >= 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS cart_items (
 user_id CHAR(32) NOT NULL, product_id VARCHAR(80) NOT NULL, quantity INT NOT NULL,
 position INT NOT NULL, PRIMARY KEY (user_id,product_id), CHECK (quantity BETWEEN 1 AND 10),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS favorites (
 user_id CHAR(32) NOT NULL, product_id VARCHAR(80) NOT NULL, position INT NOT NULL,
 PRIMARY KEY (user_id,product_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS orders (
 id CHAR(32) PRIMARY KEY, user_id CHAR(32) NOT NULL,
 created VARCHAR(30) NOT NULL, idempotency_key VARCHAR(80) NOT NULL,
 UNIQUE (user_id,idempotency_key), INDEX (user_id,created),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_items (
 order_id CHAR(32) NOT NULL, product_id VARCHAR(80) NOT NULL,
 name VARCHAR(200) NOT NULL, price DECIMAL(12,2) NULL, currency CHAR(3) NOT NULL,
 quantity INT NOT NULL, position INT NOT NULL, PRIMARY KEY (order_id,product_id),
 CHECK (quantity BETWEEN 1 AND 10),
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;
