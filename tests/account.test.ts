import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { accountApi, type Database } from '../lib/account.ts';

function fixture() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(
        `CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,password_hash TEXT,salt TEXT,state TEXT DEFAULT '{"cart":[],"favorites":[]}'); CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER); CREATE TABLE attempts(key TEXT PRIMARY KEY,count INTEGER,reset INTEGER); CREATE TABLE orders(id TEXT PRIMARY KEY,user_id TEXT,created TEXT,items TEXT,totals TEXT); CREATE TABLE reviews(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,product_id TEXT NOT NULL,rating INTEGER NOT NULL,comment TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL,UNIQUE(user_id,product_id));`,
    );
    const db: Database = {
        prepare(sql) {
            let values: unknown[] = [];
            const q = {
                bind(...v: unknown[]) {
                    values = v;
                    return q;
                },
                async first<T>() {
                    return (sqlite.prepare(sql).get(...(values as never[])) ??
                        null) as T | null;
                },
                async run() {
                    return sqlite.prepare(sql).run(...(values as never[]));
                },
                async all<T>() {
                    return {
                        results: sqlite
                            .prepare(sql)
                            .all(...(values as never[])) as T[],
                    };
                },
            };
            return q;
        },
    };
    const catalog = [
        { id: 'mouse-a', name: 'Mouse A', price: 99.95, currency: 'USD' },
        { id: 'mouse-b', name: 'Mouse B', price: null, currency: 'USD' },
    ];
    const call = (
        path: string,
        method = 'GET',
        body?: unknown,
        cookie = '',
        origin = 'http://site.test',
    ) =>
        accountApi(
            new Request(`http://site.test/api/${path}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Origin: origin,
                    Cookie: cookie,
                },
                body: body ? JSON.stringify(body) : undefined,
            }),
            db,
            catalog,
        );
    return { call, sqlite };
}
test('registers, hashes password, restores only own state and revokes session', async () => {
    const { call, sqlite } = fixture();
    const registered = await call('register', 'POST', {
        name: 'Player',
        email: 'player@example.com',
        password: 'Long-Password-42!',
    });
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];
    assert.match(registered.headers.get('set-cookie')!, /HttpOnly/);
    assert.notEqual(
        sqlite.prepare('SELECT password_hash FROM users').get()!.password_hash,
        'Long-Password-42!',
    );
    assert.equal(
        (
            await call(
                'state',
                'PUT',
                {
                    cart: [{ id: 'mouse-a', quantity: 2 }],
                    favorites: ['mouse-a'],
                },
                cookie,
            )
        ).status,
        200,
    );
    const me = (await (
        await call('account', 'GET', undefined, cookie)
    ).json()) as { state: { cart: { quantity: number }[] } };
    assert.equal(me.state.cart[0].quantity, 2);
    assert.equal((await call('account')).status, 401);
    assert.equal(
        (
            await call('login', 'POST', {
                email: 'player@example.com',
                password: 'wrong-password',
            })
        ).status,
        401,
    );
    await call('logout', 'POST', {}, cookie);
    assert.equal((await call('account', 'GET', undefined, cookie)).status, 401);
    sqlite.close();
});
test('rejects cross origin writes, invalid quantities and unknown products', async () => {
    const { call, sqlite } = fixture();
    const r = await call('register', 'POST', {
        name: 'Player',
        email: 'p@example.com',
        password: 'Long-Password-42!',
    });
    const cookie = r.headers.get('set-cookie')!.split(';')[0];
    assert.equal(
        (
            await call(
                'state',
                'PUT',
                { cart: [], favorites: [] },
                cookie,
                'https://attacker.test',
            )
        ).status,
        403,
    );
    for (const cart of [
        [{ id: 'mouse-a', quantity: -1 }],
        [{ id: 'fake', quantity: 1 }],
        [{ id: 'mouse-a', quantity: 1.5 }],
        [{ id: 'mouse-a', quantity: 11 }],
    ])
        assert.equal(
            (await call('state', 'PUT', { cart, favorites: [] }, cookie))
                .status,
            400,
        );
    sqlite.close();
});
test('calculates saved demo orders from server catalogue and isolates users', async () => {
    const { call, sqlite } = fixture();
    const first = await call('register', 'POST', {
        name: 'First',
        email: 'first@example.com',
        password: 'Long-Password-42!',
    });
    const one = first.headers.get('set-cookie')!.split(';')[0];
    const second = await call('register', 'POST', {
        name: 'Second',
        email: 'second@example.com',
        password: 'Long-Password-42!',
    });
    const two = second.headers.get('set-cookie')!.split(';')[0];
    await call(
        'state',
        'PUT',
        { cart: [{ id: 'mouse-a', quantity: 2 }], favorites: [] },
        one,
    );
    const order = await call('orders', 'POST', { total: 1 }, one);
    assert.equal(order.status, 201);
    assert.equal(
        ((await order.json()) as { order: { totals: Record<string, number> } })
            .order.totals.USD,
        199.9,
    );
    assert.equal(
        (
            (await (await call('account', 'GET', undefined, two)).json()) as {
                orders: unknown[];
            }
        ).orders.length,
        0,
    );
    assert.equal((await call('orders', 'POST', {}, two)).status, 400);
    sqlite.close();
});
test('reviews require an account and support one editable, deletable review per product', async () => {
    const { call, sqlite } = fixture();
    assert.equal((await call('reviews?productId=mouse-a')).status, 200);
    assert.equal(
        (
            await call('reviews', 'POST', {
                productId: 'mouse-a',
                rating: 5,
                comment: 'Great shape',
            })
        ).status,
        401,
    );
    const first = await call('register', 'POST', {
        name: 'First',
        email: 'first-review@example.com',
        password: 'Long-Password-42!',
    });
    const one = first.headers.get('set-cookie')!.split(';')[0];
    const second = await call('register', 'POST', {
        name: 'Second',
        email: 'second-review@example.com',
        password: 'Long-Password-42!',
    });
    const two = second.headers.get('set-cookie')!.split(';')[0];
    const created = await call(
        'reviews',
        'POST',
        { productId: 'mouse-a', rating: 5, comment: 'Great shape' },
        one,
    );
    assert.equal(created.status, 201);
    assert.equal(
        (
            await call(
                'reviews',
                'POST',
                { productId: 'mouse-a', rating: 4, comment: 'Again' },
                one,
            )
        ).status,
        409,
    );
    assert.equal(
        (
            await call(
                'reviews',
                'POST',
                { productId: 'mouse-a', rating: 6, comment: 'Invalid' },
                one,
            )
        ).status,
        400,
    );
    assert.equal(
        (
            await call(
                'reviews',
                'POST',
                { productId: 'mouse-a', rating: 3, comment: 'Someone else' },
                two,
            )
        ).status,
        201,
    );
    const list = (await (await call('reviews?productId=mouse-a')).json()) as {
        reviews: {
            id: string;
            userId: string;
            rating: number;
            comment: string;
        }[];
        average: number;
        count: number;
    };
    assert.equal(list.count, 2);
    assert.equal(list.average, 4);
    assert.equal(list.reviews[0].comment, 'Someone else');
    const id = ((await created.json()) as { review: { id: string } }).review.id;
    assert.equal(
        (
            await call(
                `reviews/${id}`,
                'PATCH',
                { rating: 4, comment: 'Updated and clear' },
                one,
            )
        ).status,
        200,
    );
    assert.equal(
        (
            await call(
                `reviews/${id}`,
                'PATCH',
                { rating: 2, comment: 'Hijack' },
                two,
            )
        ).status,
        404,
    );
    assert.equal((await call(`reviews/${id}`, 'DELETE', {}, two)).status, 404);
    assert.equal((await call(`reviews/${id}`, 'DELETE', {}, one)).status, 200);
    const remaining = (await (
        await call('reviews?productId=mouse-a')
    ).json()) as { count: number; average: number };
    assert.equal(remaining.count, 1);
    assert.equal(remaining.average, 3);
    sqlite.close();
});
