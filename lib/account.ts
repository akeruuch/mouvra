// Серверный API для варианта сайта с Cloudflare D1 (SQLite).
// Это альтернатива PHP/MySQL, а не дополнительный этап обработки PHP-запроса.
export type Query = {
    bind(...args: unknown[]): Query;
    first<T>(): Promise<T | null>;
    run(): Promise<unknown>;
    all<T>(): Promise<{ results: T[] }>;
};
export type Database = { prepare(sql: string): Query };
export type CatalogueItem = {
    id: string;
    price: number | null;
    currency: string;
    name: string;
};
export type Review = {
    id: string;
    userId: string;
    userName: string;
    productId: string;
    rating: number;
    comment: string;
    created: string;
    updated: string;
};
export type BasketLine = { id: string; quantity: number };
export type SavedState = { cart: BasketLine[]; favorites: string[] };
type User = {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    salt: string;
    state: string;
};
const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) =>
    Array.from(new Uint8Array(bytes))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async (s: string) =>
    hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

// Создаём хеш пароля с индивидуальной солью; исходный пароль в базу не записываем.
async function passwordHash(password: string, salt: string) {
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
    );
    return hex(
        await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                hash: 'SHA-256',
                salt: enc.encode(salt),
                iterations: 100000,
            },
            key,
            256,
        ),
    );
}
function equal(a: string, b: string) {
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++)
        diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return diff === 0;
}

// Проверяем товары, количество и отсутствие повторов до записи корзины в базу.
function validState(
    value: unknown,
    catalog: CatalogueItem[],
): value is SavedState {
    if (!value || typeof value !== 'object') return false;
    const { cart, favorites } = value as SavedState;
    const ids = new Set(catalog.map((p) => p.id));
    return (
        Array.isArray(cart) &&
        cart.length <= catalog.length &&
        new Set(cart.map((x) => x?.id)).size === cart.length &&
        cart.every(
            (x) =>
                x &&
                ids.has(x.id) &&
                Number.isInteger(x.quantity) &&
                x.quantity > 0 &&
                x.quantity <= 10,
        ) &&
        Array.isArray(favorites) &&
        favorites.length <= catalog.length &&
        favorites.every((x) => ids.has(x)) &&
        new Set(favorites).size === favorites.length
    );
}

// Общий обработчик D1: маршрут + HTTP-метод определяют действие; результат всегда JSON.
export async function accountApi(
    request: Request,
    db: Database,
    catalog: CatalogueItem[],
): Promise<Response> {
    const json = (
        data: unknown,
        status = 200,
        headers: Record<string, string> = {},
    ) =>
        Response.json(data, {
            status,
            headers: {
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
                ...headers,
            },
        });
    const fail = (error: string, status = 400) => json({ error }, status);
    const url = new URL(request.url);
    const route = url.pathname.replace('/api/', '');
    const reviewMatch = route.match(/^reviews\/([^/]+)$/);
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    const sessionCookie = (token: string, maxAge = 604800) =>
        `mouvra_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
    if (
        request.method !== 'GET' &&
        request.headers.get('origin') !== url.origin
    )
        return fail('Запрос отклонён. Обновите страницу.', 403);
    try {
        let body: Record<string, unknown> = {};
        if (request.method !== 'GET') {
            const raw = await request.text();
            if (raw.length > 16000) return fail('Слишком большой запрос.', 413);
            try {
                body = raw ? JSON.parse(raw) : {};
            } catch {
                return fail('Некорректные данные.');
            }
            if (!body || typeof body !== 'object' || Array.isArray(body))
                return fail('Некорректные данные.');
        }
        if (route === 'reviews' && request.method === 'GET') {
            const productId = url.searchParams.get('productId') || '';
            if (!catalog.some((p) => p.id === productId))
                return fail('Модель не найдена.', 404);
            const { results } = await db
                .prepare(
                    'SELECT reviews.id,reviews.user_id AS userId,users.name AS userName,reviews.product_id AS productId,reviews.rating,reviews.comment,reviews.created,reviews.updated FROM reviews JOIN users ON users.id=reviews.user_id WHERE reviews.product_id=? ORDER BY reviews.created DESC',
                )
                .bind(productId)
                .all<Review>();
            const average = results.length
                ? Math.round(
                      (results.reduce((sum, r) => sum + r.rating, 0) /
                          results.length) *
                          10,
                  ) / 10
                : 0;
            return json({ reviews: results, average, count: results.length });
        }
        if (
            (route === 'register' || route === 'login') &&
            request.method === 'POST'
        ) {
            const email =
                typeof body.email === 'string'
                    ? body.email.trim().toLowerCase()
                    : '';
            const password =
                typeof body.password === 'string' ? body.password : '';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
                return fail('Укажите корректный email.');
            if (password.length < 10 || password.length > 128)
                return fail('Пароль должен содержать от 10 до 128 символов.');
            const attemptKey = await digest(
                `${email}:${request.headers.get('cf-connecting-ip') || 'local'}`,
            );
            const now = Date.now();
            const attempts = await db
                .prepare('SELECT count,reset FROM attempts WHERE key=?')
                .bind(attemptKey)
                .first<{ count: number; reset: number }>();
            if (attempts && attempts.reset > now && attempts.count >= 10)
                return fail(
                    'Слишком много попыток. Повторите через 15 минут.',
                    429,
                );
            await db
                .prepare(
                    'INSERT INTO attempts(key,count,reset) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=?,reset=?',
                )
                .bind(
                    attemptKey,
                    now + 900000,
                    attempts && attempts.reset > now ? attempts.count + 1 : 1,
                    attempts && attempts.reset > now
                        ? attempts.reset
                        : now + 900000,
                )
                .run();
            let user = await db
                .prepare('SELECT * FROM users WHERE email=?')
                .bind(email)
                .first<User>();
            if (route === 'register') {
                const name =
                    typeof body.name === 'string' ? body.name.trim() : '';
                if (name.length < 2 || name.length > 60)
                    return fail('Имя должно содержать от 2 до 60 символов.');
                if (user)
                    return fail(
                        'Не удалось создать аккаунт. Попробуйте войти с этим email.',
                        409,
                    );
                const salt = random();
                user = {
                    id: crypto.randomUUID(),
                    email,
                    name,
                    salt,
                    password_hash: await passwordHash(password, salt),
                    state: JSON.stringify({ cart: [], favorites: [] }),
                };
                try {
                    await db
                        .prepare(
                            'INSERT INTO users(id,email,name,password_hash,salt,state) VALUES(?,?,?,?,?,?)',
                        )
                        .bind(
                            user.id,
                            email,
                            name,
                            user.password_hash,
                            salt,
                            user.state,
                        )
                        .run();
                } catch {
                    return fail(
                        'Не удалось создать аккаунт. Попробуйте войти.',
                        409,
                    );
                }
            } else {
                const hash = await passwordHash(
                    password,
                    user?.salt || 'mouvra-invalid-account-salt',
                );
                if (!user || !equal(hash, user.password_hash))
                    return fail('Email или пароль не совпадают.', 401);
            }
            await db
                .prepare('DELETE FROM attempts WHERE key=?')
                .bind(attemptKey)
                .run();
            const token = random();
            await db
                .prepare(
                    'INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',
                )
                .bind(await digest(token), user.id, Date.now() + 604800000)
                .run();
            return json(
                {
                    user: { id: user.id, name: user.name, email: user.email },
                    state: JSON.parse(user.state),
                },
                route === 'register' ? 201 : 200,
                { 'Set-Cookie': sessionCookie(token) },
            );
        }
        const token = request.headers
            .get('cookie')
            ?.match(/(?:^|;\s*)mouvra_session=([a-f0-9]{64})(?:;|$)/)?.[1];
        const tokenHash = token ? await digest(token) : '';
        const user = token
            ? await db
                  .prepare(
                      'SELECT users.* FROM users JOIN sessions ON sessions.user_id=users.id WHERE sessions.token=? AND sessions.expires>?',
                  )
                  .bind(tokenHash, Date.now())
                  .first<User>()
            : null;
        if (!user) return fail('Войдите в аккаунт, чтобы продолжить.', 401);
        if (route === 'reviews' && request.method === 'POST') {
            const productId =
                typeof body.productId === 'string' ? body.productId : '';
            const rating = typeof body.rating === 'number' ? body.rating : 0;
            const comment =
                typeof body.comment === 'string' ? body.comment.trim() : '';
            if (!catalog.some((p) => p.id === productId))
                return fail('Модель не найдена.', 404);
            if (!Number.isInteger(rating) || rating < 1 || rating > 5)
                return fail('Оценка должна быть от 1 до 5.', 400);
            if (comment.length < 2 || comment.length > 2000)
                return fail(
                    'Комментарий должен содержать от 2 до 2000 символов.',
                    400,
                );
            const id = crypto.randomUUID(),
                now = new Date().toISOString();
            try {
                await db
                    .prepare(
                        'INSERT INTO reviews(id,user_id,product_id,rating,comment,created,updated) VALUES(?,?,?,?,?,?,?)',
                    )
                    .bind(id, user.id, productId, rating, comment, now, now)
                    .run();
            } catch (error) {
                if (String(error).toLowerCase().includes('unique'))
                    return fail('Вы уже оставили отзыв об этой модели.', 409);
                throw error;
            }
            return json(
                {
                    review: {
                        id,
                        userId: user.id,
                        userName: user.name,
                        productId,
                        rating,
                        comment,
                        created: now,
                        updated: now,
                    },
                },
                201,
            );
        }
        if (
            reviewMatch &&
            (request.method === 'PATCH' || request.method === 'DELETE')
        ) {
            const review = await db
                .prepare('SELECT * FROM reviews WHERE id=? AND user_id=?')
                .bind(reviewMatch[1], user.id)
                .first<{
                    id: string;
                    user_id: string;
                    product_id: string;
                    rating: number;
                    comment: string;
                    created: string;
                    updated: string;
                }>();
            if (!review) return fail('Отзыв не найден.', 404);
            if (request.method === 'DELETE') {
                await db
                    .prepare('DELETE FROM reviews WHERE id=? AND user_id=?')
                    .bind(review.id, user.id)
                    .run();
                return json({ ok: true });
            }
            const rating =
                typeof body.rating === 'number' ? body.rating : review.rating;
            const comment =
                typeof body.comment === 'string'
                    ? body.comment.trim()
                    : review.comment;
            if (!Number.isInteger(rating) || rating < 1 || rating > 5)
                return fail('Оценка должна быть от 1 до 5.', 400);
            if (comment.length < 2 || comment.length > 2000)
                return fail(
                    'Комментарий должен содержать от 2 до 2000 символов.',
                    400,
                );
            const updated = new Date().toISOString();
            await db
                .prepare(
                    'UPDATE reviews SET rating=?,comment=?,updated=? WHERE id=? AND user_id=?',
                )
                .bind(rating, comment, updated, review.id, user.id)
                .run();
            return json({
                review: {
                    id: review.id,
                    userId: user.id,
                    userName: user.name,
                    productId: review.product_id,
                    rating,
                    comment,
                    created: review.created,
                    updated,
                },
            });
        }
        if (route === 'logout' && request.method === 'POST') {
            await db
                .prepare('DELETE FROM sessions WHERE token=?')
                .bind(tokenHash)
                .run();
            return json({ ok: true }, 200, {
                'Set-Cookie': sessionCookie('', 0),
            });
        }
        if (route === 'account' && request.method === 'GET') {
            const { results } = await db
                .prepare(
                    'SELECT id,created,items,totals FROM orders WHERE user_id=? ORDER BY created DESC LIMIT 50',
                )
                .bind(user.id)
                .all<{
                    id: string;
                    created: string;
                    items: string;
                    totals: string;
                }>();
            return json({
                user: { id: user.id, name: user.name, email: user.email },
                state: JSON.parse(user.state),
                orders: results.map((o) => ({
                    ...o,
                    items: JSON.parse(o.items),
                    totals: JSON.parse(o.totals),
                })),
            });
        }
        if (route === 'state' && request.method === 'PUT') {
            if (!validState(body, catalog))
                return fail(
                    'Проверьте товары и количество: от 1 до 10 для каждой модели.',
                );
            const state = {
                cart: body.cart.map((x) => ({
                    id: x.id,
                    quantity: x.quantity,
                })),
                favorites: body.favorites,
            };
            await db
                .prepare('UPDATE users SET state=? WHERE id=?')
                .bind(JSON.stringify(state), user.id)
                .run();
            return json({ state });
        }
        if (route === 'profile' && request.method === 'PATCH') {
            const name = typeof body.name === 'string' ? body.name.trim() : '';
            if (name.length < 2 || name.length > 60)
                return fail('Имя должно содержать от 2 до 60 символов.');
            await db
                .prepare('UPDATE users SET name=? WHERE id=?')
                .bind(name, user.id)
                .run();
            return json({ user: { id: user.id, name, email: user.email } });
        }
        if (route === 'orders' && request.method === 'POST') {
            const state: SavedState = JSON.parse(user.state);
            if (!validState(state, catalog) || !state.cart.length)
                return fail('Добавьте мышь в корзину.');
            const items = state.cart.map((line) => ({
                ...line,
                ...catalog.find((p) => p.id === line.id)!,
            }));
            const totals: Record<string, number> = {};
            for (const item of items)
                if (item.price !== null)
                    totals[item.currency] =
                        Math.round(
                            ((totals[item.currency] || 0) +
                                item.price * item.quantity) *
                                100,
                        ) / 100;
            const order = {
                id: crypto.randomUUID(),
                created: new Date().toISOString(),
                items,
                totals,
            };
            await db
                .prepare(
                    'INSERT INTO orders(id,user_id,created,items,totals) VALUES(?,?,?,?,?)',
                )
                .bind(
                    order.id,
                    user.id,
                    order.created,
                    JSON.stringify(items),
                    JSON.stringify(totals),
                )
                .run();
            return json({ order }, 201);
        }
        return fail('Этот адрес не найден.', 404);
    } catch (error) {
        console.error(
            'Account request failed',
            error instanceof Error ? error.name : 'UnknownError',
        );
        return fail('Сервис временно недоступен. Попробуйте ещё раз.', 503);
    }
}
