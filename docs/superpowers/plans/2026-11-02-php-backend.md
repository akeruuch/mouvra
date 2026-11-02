# PHP backend implementation plan

> Execute inline with executing-plans and test-driven-development. User approved implementation without further questions.

**Goal:** Run MOUVRA with a real PHP/MySQL backend and demonstrate lecture 35.
**Architecture:** Apache serves the React SPA and same-origin PHP API; MySQL persists relational data in a Docker volume.
**Tech stack:** PHP 8.3, PDO, MySQL 8.4, Docker Compose, existing Vite/React, Node test runner.
**Spec:** ../specs/2026-11-02-php-backend-design.md

## Constraints and review focus
Keep GitHub Pages and D1 behavior. No payments or deployment. No destructive SQL against user data. Test unknown prices, duplicate order retries, cross-user access, failed catalogue loading, and persistence after container recreation.

## Task 1 — PHP API and database
- [ ] Add backend/tests/api.test.mjs with HTTP integration assertions for health, catalogue, auth, state, profile, orders, isolation, invalid inputs, CSRF and idempotency. Run before implementation to establish missing backend.
- [ ] Add backend/src/{bootstrap,auth,selection,orders,api}.php, public/api.php, migrations/001.sql, bin/console.php. Preserve existing response contracts; products endpoint returns {products,verifiedAt}; health returns {status,database,products}.
- [ ] Add Dockerfile, compose.yaml, backend/docker config, .env.example and setup script. Migrate and seed through explicit CLI commands.
- [ ] Run API tests against the real container and MySQL. Verify repeated migration/import and volume persistence.

## Task 2 — React integration
- [ ] Add PHP Vite build mode with root base, disable staticPages only in this build, fetch catalogue before rendering, show retry for load failure.
- [ ] Preserve public products binding via replaceCatalog so existing UI reads DB-backed values; compute id validation after load.
- [ ] Pass idempotency key from order UI; retain key on uncertain response, rotate after success or changed selection.
- [ ] Add browser integration tests/manual evidence for registration, cart, save, logout, login, order history; run npm test, typecheck, lint, PHP and Pages builds.

## Task 3 — Lecture demonstration and handoff
- [x] Keep the backend explanation in documentation; no educational page is included in the UI.
- [ ] Write docs/php-backend.md and docs/lecture35.md: startup, schema, contracts, backup/restore, all lecture exercises and questions, commands and component mapping.
- [ ] Request one final independent review per executing-plans; address material findings and rerun affected checks.

## Execution ledger
- Plan approved by user instruction “делай без дополнительных вопросов”. Ruling: use current checkout on a feature branch; no need for a second checkout for this single implementation. Keep all changes reviewable and uncommitted.
- Preflight: Task 2 consumes Task 1 products and existing account contracts; Task 3 consumes health. Contracts specified above.
