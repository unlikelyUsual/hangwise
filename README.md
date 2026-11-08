# Hangwise

Hangwise is a demo skeleton for a paid, non-sexual, one-day public date marketplace. A customer can look at fictional companion profiles, chat, and request paid time at a public venue. A booking is not sex, not a romance, and not consent to sexual contact.

This repository is not a live product. Payments, identity verification, legal approval, and app-store approval are unresolved. The API refuses to boot with `NODE_ENV=production`. Real charges are disabled.

## Layout

- `apps/api` — NestJS 12 on Fastify, Prisma 7, PostgreSQL
- `apps/mobile` — Flutter client for iOS and Android
- `docs` — schema, API contract, setup, and legal caveats
- `docker-compose.yml` — local Postgres 16 when Docker is available

## What is real in this skeleton

Health, OpenAPI, config validation, companion discovery, availability, booking requests, status changes, conflict checks, idempotency, and Postgres persistence. Chat, reports, blocks, check-ins, and reviews are thin stored flows. Payments, verification, notifications, and file storage return honest unavailable results.

## Local API

Use Node.js 24.9 or newer. The machine default may be older; this workspace was run with Node 24.22.2 from nvm.

```bash
export PATH="$HOME/.nvm/versions/node/v24.22.2/bin:$PATH"
cd "/Users/prabhat/Documents/Side Projects/Hangwise"
cp apps/api/.env.example apps/api/.env
npm ci
npm run db:migrate
npm run db:seed
npm test
npm run build
npm start
```

The example database URL expects Postgres on port 5432, which is what `docker compose up -d postgres` publishes. Docker was not running on the machine used to build this skeleton. Migrations and seed were executed against a temporary PostgreSQL 14.18 cluster on `127.0.0.1:5433` instead. See [docs/local-setup.md](docs/local-setup.md).

Development auth, demo personas, and sample prices are documented in that same file. The dev secret in `.env.example` is a local placeholder.

## Mobile

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000
```

Android emulator: `http://10.0.2.2:3000`. A physical device needs the computer's LAN address. iOS signing needs a full Xcode install; Command Line Tools alone are not enough.

## More detail

- [Local setup and commands](docs/local-setup.md)
- [What is implemented](docs/implemented-vs-scaffold.md)
- [API contracts](docs/api-contracts.md)
- [Schema and ER diagram](docs/er-diagram.md)
- [Data dictionary](docs/data-dictionary.md)
- [Privacy and legal caveats](docs/privacy-and-legal-caveats.md)
- [Future admin](docs/admin-future.md)
- [OpenAPI document](docs/openapi.json), also served at `http://127.0.0.1:3000/docs`
