# Day page

Part of the [architecture overview](README.md).

## Purpose

Everything a visitor or crawler fetches: the server-rendered page for each date, date navigation, the share button, and `sitemap.xml`. This slice is also what starts on-demand photo assignment for a day nobody has requested yet.

## Entry points

| Entry                  | Trigger                                                | Code                                                               |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `cat`                  | HTTPS. Hosting rewrites `/` and `/YYYY-MM-DD` to it.   | [render-cat-task.ts](../functions/src/day-page/render-cat-task.ts) |
| `sitemap`              | HTTPS. Hosting rewrites `/sitemap.xml` to it. 512 MiB. | [sitemap-task.ts](../functions/src/day-page/sitemap-task.ts)       |
| `404.html`, `images/*` | Static files served by Hosting from `public/`          | [assets/](../assets/)                                              |

## Data

| Data                       | Access                             | Notes                                                                                                                                                                 |
| -------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `days/{YYYY-MM-DD}`        | Reads; creates placeholder records | Only through [Day assignment](day-assignment.md)'s `getPhotoForDate()`, `getCompletedDaysSince()`, and `createNewDayRecord()`. Day assignment fills the placeholders. |
| `config/config`: `minDate` | Reads                              | Earliest date that is served or listed                                                                                                                                |

## `cat` request handling

| Condition                                                    | Status | Body                                                           |
| ------------------------------------------------------------ | ------ | -------------------------------------------------------------- |
| Method is not GET                                            | 403    | `Forbidden!`                                                   |
| Path is not `/` and doesn't match `^/\d{4}-\d{2}-\d{2}$`     | 404    | `Invalid date format. Use YYYY-MM-DD.`                         |
| Not a real calendar date (for example `2025-02-30`)          | 404    | `Invalid date.`                                                |
| Date is before `config.minDate`                              | 403    | `Forbidden! Dates before <minDate> are not allowed.`           |
| Date is after today (UTC)                                    | 404    | `Future dates are not available.`                              |
| Record is `completed`                                        | 200    | Photo page                                                     |
| Anything else                                                | 200    | Processing page. If no record was found, one is created first. |
| An exception, including a missing or invalid `config/config` | 500    | `Error fetching cat image`                                     |

- `/` means today in UTC. The `minDate` and future-date checks are skipped for `/`.
- The query string is ignored when matching the path.
- Error bodies are plain text. Hosting's [404.html](../assets/404.html) is only served for static paths that match neither a file nor a rewrite.

`getPhotoForDate()` maps the stored record as follows:

| Stored record                                   | Returned             | What the handler does                                                                                      |
| ----------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `completed` with a photo                        | `CompletedDayRecord` | Renders the photo page                                                                                     |
| `created` with `photo: null`                    | `NewDayRecord`       | Renders the processing page                                                                                |
| No document, `processing`, or inconsistent data | `null`               | Calls `createNewDayRecord()`, which creates a record only if none exists, then renders the processing page |

## Rendering

[template.ts](../functions/src/day-page/template.ts) builds a complete HTML document with lit-html. `@lit-labs/ssr` `render()` turns it into a string, which is sent as a single response. There is no hydration: the client bundle only adds behavior to the buttons.

- **`<head>`**: static title, favicon, inline CSS, static Open Graph and Twitter Card tags (the same for every day), and `<script src="/index.js" defer>`.
- **Header**:
  - A previous-day link, always shown.
  - A next-day link, shown only when the date is before today.
  - A "Daily Cat" title that links to `/`.
  - A notifications button, hidden until [Notifications](notifications.md) shows it.
  - A share button, shown when `navigator.share` exists. It shares `location.href`.
- **Photo page**, `renderPhotoPage(TemplateData)`:
  - The author's avatar, name, and `@username`.
  - The like count, formatted with `toLocaleString()`.
  - Up to 5 tags, each linking to an Unsplash search.
  - The `urls.regular` image, linking to the photo on Unsplash.
  - Every Unsplash link carries `utm_source=daily.cat&utm_medium=referral`, as Unsplash's attribution rules require.
- **Processing page**, `renderProcessingPage(TemplateData)`: a loading animation and a script that reloads the page every 2 s with `?attempt=N`. After 10 reloads it stops and shows a "taking longer than expected" message.
- **Footer**: credits for GitHub, abrah.am, Unsplash, and unDraw.
- **`#toast`**: an empty element used by the client's `showToast()`.

Icons come from [svg.ts](../functions/src/day-page/svg.ts). `calculateNavigationUrls(date)` in [navigation.ts](../functions/src/day-page/navigation.ts) returns `prevDateUrl`, `nextDateUrl` (`#` when hidden), and `showNextArrow`.

## Sitemap

1. Calls Day assignment's `getCompletedDaysSince(config.minDate)`, which returns the `completed` records with document ID `>= minDate`, ordered by ID.
2. Writes the homepage entry (`changefreq` daily, priority 1.0).
3. Writes one entry per day: `lastmod` is the date part of `updatedAt`, `changefreq` is monthly, and priority is 0.8.
4. Builds the base URL from the `x-forwarded-proto` and `x-forwarded-host` request headers.

Non-GET requests get 405. Errors get 500.

## Caching

| Response  | `Cache-Control`                 | Why                                                      |
| --------- | ------------------------------- | -------------------------------------------------------- |
| Day pages | `public, max-age=1, s-maxage=1` | So a page shows its photo as soon as processing finishes |
| Sitemap   | `public, max-age=3600`          |                                                          |

## Invariants and contracts

- Only dates from `minDate` through today (UTC) are served.
- A visit to a day with no record is the only thing that starts on-demand assignment. The record must be created with `status: 'created'` and `photo: null`.
- Visits never change an existing record. Each reload of the processing page calls `createNewDayRecord()` again, but it does nothing once the record exists.
- The processing page only polls. It never writes anything.

## Known issues

1. **The previous-day link is always rendered.** On `minDate` it leads to a 403 plain-text response.
2. **Social previews are generic.** The Open Graph and Twitter tags are the same for every day. `og:image` is a relative URL, but most link-preview scrapers expect an absolute one.
3. **The sitemap trusts forwarded headers.** Firebase Hosting sets `x-forwarded-host`, but if the function URL is called directly, the caller controls the host written into the sitemap.

## Code and tests

Everything is in [functions/src/day-page/](../functions/src/day-page/). Its [index.ts](../functions/src/day-page/index.ts) exports only the `cat` and `sitemap` functions.

- [render-cat-task.ts](../functions/src/day-page/render-cat-task.ts), [render-cat-task.test.ts](../functions/src/day-page/render-cat-task.test.ts)
- [sitemap-task.ts](../functions/src/day-page/sitemap-task.ts), [sitemap-task.test.ts](../functions/src/day-page/sitemap-task.test.ts)
- [template.ts](../functions/src/day-page/template.ts), [template.test.ts](../functions/src/day-page/template.test.ts)
- [navigation.ts](../functions/src/day-page/navigation.ts), [navigation.test.ts](../functions/src/day-page/navigation.test.ts)
- [svg.ts](../functions/src/day-page/svg.ts)
- [assets/](../assets/)
