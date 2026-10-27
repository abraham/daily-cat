# Platform

Part of the [architecture overview](README.md).

## Purpose

The infrastructure every slice depends on: Firebase Hosting routing, Firestore setup and security, the shared `config/config` document, secrets, the build, local development, testing, and CI/CD.

## Hosting

[firebase.json](../firebase.json) serves `public/` and rewrites these paths to functions:

| Source                                        | Function  | Slice                             |
| --------------------------------------------- | --------- | --------------------------------- |
| `/`                                           | `cat`     | [Day page](day-page.md)           |
| `/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]` | `cat`     | [Day page](day-page.md)           |
| `/topics`                                     | `topics`  | [Notifications](notifications.md) |
| `/sitemap.xml`                                | `sitemap` | [Day page](day-page.md)           |

- Any other path is served from `public/`, falling back to `404.html`.
- The hosting `predeploy` hook runs `npm run build`.
- Functions don't set a region, so they deploy to the default region, `us-central1`. Firestore is also in `us-central1`.

## Functions runtime

- [functions/](../functions/) is a separate npm package (`main: lib/index.js`, `engines.node: 22`). Firebase deploys it with runtime `nodejs22`, and its `predeploy` hook runs `npm --prefix functions run build`.
- [functions/src/index.ts](../functions/src/index.ts) only re-exports the eight functions from `src/tasks/`. Each task file defines exactly one function. [index.test.ts](../functions/src/index.test.ts) fails if that list of names changes, because Firebase deploys a renamed function as a delete plus a create.
- Every storage module, and `sitemap-task.ts`, initializes `firebase-admin` itself with a `getApps().length === 0` guard.

## Firestore

- The database is `(default)` in `us-central1`.
- [firestore.rules](../firestore.rules) denies every read and write. Only the Admin SDK, which bypasses rules, touches data. Clients go through the HTTP functions.
- [firestore.indexes.json](../firestore.indexes.json) defines no custom indexes. Every query filters on one field plus the document ID.

| Collection            | Owner slice                           |
| --------------------- | ------------------------------------- |
| `days`                | [Day assignment](day-assignment.md)   |
| `photo-ids`           | [Day assignment](day-assignment.md)   |
| `available-photo-ids` | [Photo ingestion](photo-ingestion.md) |
| `tokens`              | [Notifications](notifications.md)     |
| `config`              | Platform                              |

## `config/config`

[config-storage.ts](../functions/src/storage/config-storage.ts) provides `getConfig()` and `updateConfig(partial)`. Nothing creates the document.

- If it is missing, `getConfig()` throws. Every page then returns 500, and every scheduled job fails.
- It has to be provisioned by hand in production. Locally it comes from `seed/`.

| Field               | Type           | Used by                                     |
| ------------------- | -------------- | ------------------------------------------- |
| `minDate`           | `YYYY-MM-DD`   | Day page                                    |
| `importEnabled`     | boolean        | Photo ingestion                             |
| `importLimit`       | number         | Photo ingestion                             |
| `lastPage`          | numeric string | Photo ingestion and Day assignment (shared) |
| `processLimit`      | number         | Day assignment                              |
| `processingMinDate` | `YYYY-MM-DD`   | Day assignment                              |

## Secrets

`UNSPLASH_CLIENT_ID` is declared with `defineSecret()` in [photo-processor.ts](../functions/src/photo-processor.ts). It is bound to `onDayRecordCreated`, `importPhotosScheduled`, and `processAvailablePhotosScheduled`.

| Environment | How to set it                                       |
| ----------- | --------------------------------------------------- |
| Production  | `firebase functions:secrets:set UNSPLASH_CLIENT_ID` |
| Emulator    | `functions/.secret.local`                           |

## Build

| Output                              | Tool                                                                        | Source                                                          |
| ----------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `functions/lib/`                    | `tsc` (TypeScript 7), [functions/tsconfig.json](../functions/tsconfig.json) | `functions/src/`                                                |
| `public/index.js`                   | Rollup, UMD bundle named `DailyCat`                                         | [src/index.ts](../src/index.ts)                                 |
| `public/firebase-messaging-sw.js`   | Rollup, IIFE bundle                                                         | [src/firebase-messaging-sw.ts](../src/firebase-messaging-sw.ts) |
| `public/404.html`, `public/images/` | `rollup-plugin-copy`                                                        | [assets/](../assets/)                                           |

- Root `npm run build` builds the functions first, then runs `rollup -c`.
- The functions build deletes `lib/` before running `tsc`, so files from moved or deleted modules don't linger. `npm start` (`tsc --watch`) doesn't.
- The root project uses TypeScript 6 with [tsconfig.json](../tsconfig.json).

## Local development

| Command (root)                   | Effect                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                         | Installs root dependencies. `postinstall` runs `npm ci --prefix functions`.                                            |
| `npm start`                      | `firebase emulators:exec "npm start --prefix functions" --import=seed --ui`. The functions package runs `tsc --watch`. |
| `npm run format`, `format:check` | Prettier on the whole repo, including Markdown files                                                                   |

Emulator ports:

| Emulator  | Port |
| --------- | ---- |
| UI        | 4000 |
| Hosting   | 5000 |
| Functions | 5001 |
| Firestore | 8080 |
| Pub/Sub   | 8085 |
| Database  | 9000 |
| Auth      | 9099 |
| Eventarc  | 9299 |
| Tasks     | 9499 |

`singleProjectMode` is on. [seed/](../seed/) is a Firebase emulator export, which includes a local `config/config`.

## Testing

| Suite     | Command                       | Environment                                                        | Scope                        |
| --------- | ----------------------------- | ------------------------------------------------------------------ | ---------------------------- |
| Client    | `npm test`                    | Vitest + jsdom, setup in [src/test-setup.ts](../src/test-setup.ts) | `src/**/*.test.ts`           |
| Functions | `npm test --prefix functions` | Vitest, Node                                                       | `functions/src/**/*.test.ts` |

- Tests mock `firebase-functions`, `firebase-admin`, `fetch`, and sibling modules. They don't run against the emulators.
- Unsplash responses come from [functions/src/fixtures/](../functions/src/fixtures/).

## CI/CD

- **[ci.yml](../.github/workflows/ci.yml)** runs on every push, on Node 22 and 24: `npm ci`, `npm run format:check`, `npm run build`, `npm test`, then `npm test --prefix functions`.
- **[deploy.yml](../.github/workflows/deploy.yml)** runs on pushes to `main`. It uses the `production` environment (`https://daily.cat`), the concurrency group `deploy-production`, and Node 22.
  1. Runs `npm ci` and builds the functions.
  2. Authenticates with GitHub OIDC through Workload Identity Federation (`abraham/firebase-wif`, `vars.FIREBASE_WIF_PROVIDER`, `vars.FIREBASE_WIF_SERVICE_ACCOUNT`).
  3. Runs `npx firebase deploy --project daily-cat --non-interactive`.

  The predeploy hooks rebuild both the functions and hosting.

- **[dependabot.yml](../.github/dependabot.yml)** handles dependency updates.

## Known issues

1. **[functions/README.md](../functions/README.md) is out of date.** It describes an older layout (`src/cat-api.ts`, `src/types.ts`, `test/`) and an environment variable instead of a secret. It also lists scripts that don't exist: `build:watch`, `serve`, `deploy`, `format`.
2. **Node version requirements don't agree.** The root `engines.node` is `>=18`, the functions package pins `22`, and CI tests 22 and 24.
3. **`config/config` has no schema check or defaults.** A missing field causes failures at runtime, for example `Number(undefined)` for `lastPage`.
