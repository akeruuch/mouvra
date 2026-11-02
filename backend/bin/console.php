<?php
declare(strict_types=1);
require __DIR__.'/../src/bootstrap.php';
$command=$argv[1]??'';
try {
    if ($command==='migrate') {
        if (!(int)query("SELECT GET_LOCK('mouvra_migrations',30)")->fetchColumn()) throw new RuntimeException('Migration lock unavailable');
        try {
            query('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
            foreach (glob(__DIR__.'/../migrations/*.sql') as $file) {
                $version=basename($file);
                if (query('SELECT version FROM schema_migrations WHERE version=?',[$version])->fetch()) continue;
                // MySQL DDL commits implicitly. Each initial table uses IF NOT EXISTS for restartability.
                foreach (explode(';',file_get_contents($file)) as $statement) if (trim($statement)!=='') db()->exec($statement);
                query('INSERT INTO schema_migrations(version) VALUES(?)',[$version]);
                echo "Applied $version\n";
            }
        } finally {query("SELECT RELEASE_LOCK('mouvra_migrations')");}
        echo "Migrations ready\n";
    } elseif ($command==='seed') {
        $catalog=json_decode(file_get_contents(__DIR__.'/../data/mice.json'),true,64,JSON_THROW_ON_ERROR);
        transaction(function() use ($catalog) {
            foreach ($catalog['products'] as $position=>$p) {
                query('INSERT INTO products(id,name,price,currency,details,verified_at,position) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),price=VALUES(price),currency=VALUES(currency),details=VALUES(details),verified_at=VALUES(verified_at),position=VALUES(position)',
                    [$p['id'],$p['brand'].' '.$p['name'],$p['price']['amount'],$p['price']['currency']??'USD',json_encode($p,JSON_THROW_ON_ERROR),$catalog['verifiedAt'],$position]);
            }
        });
        echo 'Imported '.count($catalog['products'])." products (users and orders untouched)\n";
    } elseif ($command==='cleanup') {
        query('DELETE FROM sessions WHERE expires<?',[time()]);
        query('DELETE FROM auth_attempts WHERE reset_at<?',[time()]);
        echo "Expired authentication records removed\n";
    } else {fwrite(STDERR,"Usage: php bin/console.php migrate|seed|cleanup\n");exit(1);}
} catch (Throwable $e) {fwrite(STDERR,'Command failed: '.$e->getMessage()."\n");exit(1);}
