# Local setup

Commands below assume the repo root:

`/Users/prabhat/Documents/Side Projects/Hangwise`

## Toolchain used while building this skeleton

| Tool | Result |
| --- | --- |
| Node.js | Default `/usr/local/bin/node` is v14.17.3 and is too old. Use nvm Node **24.22.2** (`>=24.9`). |
| npm | 11.19.1, from that Node install |
| PostgreSQL | Client and server **14.18** from Homebrew. A temporary cluster was started on `127.0.0.1:5433`, data dir `/tmp/hangwise-pgdata`, trust auth, not a launchd service. |
| Docker | `docker` exists and Docker.app is installed, but the daemon was not running. Compose was not executed. |
| Flutter | SDK 3.47.9 (Dart 3.13.7) at `~/.local/share/flutter`, not previously on `PATH`. `flutter analyze` reported no issues. `flutter test` passed 8 tests. |
| Xcode | `xcode-select` points at Command Line Tools only. No `Xcode.app`. `flutter build ios --no-codesign` failed with "Application not configured for iOS". Signing was not attempted. |
| Android SDK | `ANDROID_HOME` is unset and `flutter build apk --debug` stopped with "No Android SDK found". |

Stop the temporary database with:

```bash
/opt/homebrew/opt/postgresql@14/bin/pg_ctl -D /tmp/hangwise-pgdata stop
```

## API

```bash
export PATH="$HOME/.nvm/versions/node/v24.22.2/bin:$PATH"
cp apps/api/.env.example apps/api/.env
npm ci
npm run db:migrate
npm run db:seed
npm test
npm run lint
npm run build
npm run test:integration
npm start
```

`npm test` does not need Postgres. It uses an in-memory repository. `npm run test:integration` needs `DATABASE_URL` pointing at a migrated database. Jest is started with `NODE_OPTIONS=--experimental-vm-modules` because NestJS 12 ships ESM and this Node build only exposes `vm.SourceTextModule` behind that flag.

OpenAPI UI: `http://127.0.0.1:3000/docs`. JSON: `http://127.0.0.1:3000/openapi.json`. Regenerate the committed file with `npm run build && npm run openapi`.

One-shot hold expiry, not a scheduler:

```bash
npm run build
npm run worker
```

### Docker Postgres

When the Docker daemon is running:

```bash
docker compose up -d postgres
```

That uses Postgres 16 on port 5432 with user, password, and database `hangwise`. Put that URL in `apps/api/.env`. The password is a local default, not a production secret.

The temporary 14.18 cluster used for validation:

```bash
DATABASE_URL=postgresql://hangwise:hangwise@127.0.0.1:5433/hangwise
```

### Demo auth

`AUTH_MODE=development` plus `NODE_ENV=development` or `test` accepts:

- `X-Hangwise-Dev-User`: a demo user id
- `X-Hangwise-Dev-Secret`: `hangwise-dev-secret` unless you change the example

Any other auth mode rejects protected routes. The role comes from the database row, not from the header. Non-demo users are rejected. There is no signup.

| Persona | Id | Role |
| --- | --- | --- |
| Alex Demo | `11111111-1111-4111-8111-111111111111` | customer |
| Priya Demo | `11111111-1111-4111-8111-111111111112` | customer |
| Maya Srisai | `22222222-2222-4222-8222-222222222221` | companion |
| Arun Desai | `22222222-2222-4222-8222-222222222222` | companion |
| Lena Moretti | `22222222-2222-4222-8222-222222222223` | companion |
| Kenji Aoki | `22222222-2222-4222-8222-222222222224` | companion |
| Admin Demo | `33333333-3333-4333-8333-333333333333` | admin |

Create booking requests with header `Idempotency-Key` (8–80 letters, numbers, `_`, or `-`).

### Sample prices

Minor units are satang. 1 THB = 100 satang. This skeleton assumes a 2-digit exponent and only snapshots THB.

| Companion | Listed rate |
| --- | --- |
| Maya Srisai | 1,500.00 THB/hour = 150000 |
| Arun Desai | 1,200.00 THB/hour = 120000 |
| Lena Moretti | 1,800.00 THB/hour = 180000 |
| Kenji Aoki | 1,600.00 THB/hour = 160000 |

A two-hour Maya request snapshots 300000. `platformFeeMinor` is null and `feePolicy` is `unknown` unless `PLATFORM_FEE_BPS` is set to an integer from 0 to 10000. There is no default take rate.

Seeded availability is 10:00–18:00 Asia/Bangkok, stored as UTC, for several days around the seed time. Windows are half-open. A booking may start when another ends.

## Mobile

```bash
export PATH="$HOME/.local/share/flutter/bin:$PATH"
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=DEV_AUTH_SECRET=hangwise-dev-secret
```

| Target | API base URL |
| --- | --- |
| iOS Simulator | `http://127.0.0.1:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical device | `http://<computer-lan-ip>:3000` |

The API listens on `0.0.0.0` in the example env so an emulator on the same machine can connect. That bind is for local demo only.

Debug Android allows cleartext HTTP. iOS allows local networking. A release build has no HTTPS endpoint in this skeleton, so a store build would not be able to call this API.

The in-app persona switcher sends the development headers. If the API is down, screens show an error. They do not fill in fictional cards after a failure. The people you see on a successful response come from the seeded API.
