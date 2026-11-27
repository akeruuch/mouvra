# MOUVRA

Независимый каталог игровых мышей: характеристики из первичных источников, фотографии производителей, сравнение моделей и просмотр доступных 3D-файлов.

## Сайт

[Открыть MOUVRA](https://akeruuch.github.io/mouvra/)

GitHub Pages публикует статическую версию из `main` через workflow `.github/workflows/pages.yml`. В ней каталог, сравнение, избранное и демонстрационный кабинет работают в браузере. Подборки сохраняются только на текущем устройстве; регистрация, синхронизация между устройствами и серверные заказы на GitHub Pages недоступны.

## Локальная разработка

### PHP + MySQL: полноценный сервер

```sh
npm run setup:php
docker compose up -d --build
docker compose exec web php /var/www/backend/bin/console.php migrate
docker compose exec web php /var/www/backend/bin/console.php seed
```

Откройте [локальный сайт](http://127.0.0.1:8080). Нужен запущенный Docker Desktop. Данные сохраняются в именованном томе MySQL. [Инструкция PHP-бэкенда](docs/php-backend.md) · [Лекция 35 и сценарий показа](docs/lecture35.md).

### Исходный режим разработки

Требуется Node.js 22.22.2+ в ветке 22 или 24.15.0+ в ветке 24.

```sh
npm ci
npm run dev
```

Локальная версия открывается на `http://127.0.0.1:5173`. Для проверки сборки GitHub Pages:

```sh
npm run build:pages
```

Готовые файлы появятся в `dist/pages/`. Полную серверную сборку можно проверить командой `npm run build`.

## Форматирование и проверка кода

В VS Code установлены Prettier, ESLint и Stylelint. Настройки проекта включают
форматирование при сохранении. В доверенной папке расширение Prettier использует
локальную версию из npm и правила `.prettierrc.json`.

```sh
npm run format:check
npm run format
npm run check
```

`format:check` проверяет оформление, `format` исправляет его, `check` также
запускает Stylelint, ESLint, TypeScript и тесты. GitHub Actions выполняет эти
проверки и сборку Pages при push в `main` и `codex/mouvra-continuation`.
[Выполнение лекции 54](docs/lecture54.md) · [Как читать код](docs/CODE_GUIDE.md).

В PowerShell при уже установленных зависимостях можно запустить `.\check-code.cmd`
для проверки или `.\format-code.cmd` для форматирования, даже если команда npm
не добавлена в PATH.

## Данные каталога

Каталог находится в `research/mice.json`. Ссылки на официальные страницы и источники изображений приведены в карточках и разделе «Источники данных». Изображения, 3D-файлы и товарные знаки принадлежат их правообладателям.
