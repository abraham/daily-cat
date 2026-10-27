# Daily Cat Firebase Functions

The Cloud Functions behind [daily.cat](https://daily.cat), written in TypeScript. How the system works is described in [specs/](../specs/README.md).

## Setup

Run `npm ci` in the repository root. Its `postinstall` also installs this package.

The `UNSPLASH_CLIENT_ID` secret is read with `defineSecret()`, not from an environment variable:

- **Emulator**: put `UNSPLASH_CLIENT_ID=...` in `functions/.secret.local`.
- **Production**: `firebase functions:secrets:set UNSPLASH_CLIENT_ID`.

## Scripts

| Script               | Effect                                                            |
| -------------------- | ----------------------------------------------------------------- |
| `npm run build`      | Deletes `lib/`, then compiles `src/` with `tsc`                   |
| `npm start`          | `tsc --watch`. The root `npm start` runs it inside the emulators. |
| `npm run shell`      | Builds, then opens `firebase functions:shell`                     |
| `npm test`           | Runs the Vitest suite once                                        |
| `npm run test:watch` | Runs Vitest in watch mode                                         |
| `npm run test:ui`    | Runs Vitest with its browser UI                                   |

Formatting, deploys, and the emulators are run from the repository root.

## Layout

The code has one folder per slice of the system:

```
src/
├── index.ts          # Re-exports the nine deployed functions
├── platform/         # Firebase app, config/config, secrets
├── ingestion/        # Photo ingestion: Unsplash client, available-photo-ids queue
├── assignment/       # Day assignment: days and photo-ids
├── day-page/         # Day page: cat and sitemap
└── notifications/    # Notifications: topics, sendNotificationsScheduled, pruneTokensScheduled, tokens

lib/                  # Compiled output (gitignored)
```

- Each slice's `index.ts` is its public API. Code in one slice imports another slice only through that file. [boundaries.test.ts](src/boundaries.test.ts) enforces this. Tests may still mock another slice's internal modules.
- [index.test.ts](src/index.test.ts) fails if the exported function names change. Firebase deploys a renamed function as a delete plus a create.
- Tests sit next to the code they cover and mock Firebase. They don't use the emulators.
