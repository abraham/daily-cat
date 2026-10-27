# Styling and dark theme

Part of the [architecture overview](README.md). Status: milestones T1 and T2 are **done**; T3 to T5 are **proposed**.

## Purpose

How the site's CSS should be organized, and how it gets a dark theme that follows the visitor's system setting. It covers every page the site serves: the day pages and processing page from the [Day page](day-page.md) slice, and the static `404.html`.

## Goals and non-goals

Goals:

- One stylesheet that can be linted and cached, instead of CSS inside a TypeScript string.
- Every color comes from a named token, so a theme is a set of token values.
- A dark theme that follows `prefers-color-scheme`, with no flash of the wrong theme.
- Fix the accessibility gaps found in review: zoom, focus, motion, and contrast.
- Ship in small steps. Each milestone below leaves the site working, and only milestones T4 and T5 change how it looks.

Non-goals:

- A manual light/dark switch. See [Open questions](#open-questions).
- A redesign. Sizes, spacing, and the light palette stay as they are.
- A CSS framework or a build step for CSS.

## Current state

- Since T1, all day-page CSS lives in [assets/styles.css](../assets/styles.css), which every day page links from `<head>`. `404.html` doesn't use it yet.
- Before T1, about 550 lines of CSS sat inside the `renderPage()` template literal in [template.ts](../functions/src/day-page/template.ts) and were re-sent with almost every request. The processing page also emitted a second `<style>` block inside `<body>` for the spinner.
- Since T2, the stylesheet is organized by section and mobile-first, with one `@media (min-width: 1025px)` block and no `!important`. The header, footer, and profile are solid white, the icon buttons share `.icon-button`, and the dead code is gone. It went from 625 to 458 lines. The bullets below that describe the old structure are kept for the record and marked as fixed.
- [svg.ts](../functions/src/day-page/svg.ts) hard-codes icon fills (`#333` and `#1f1f1f`). The buttons change `color` on hover, but the icons don't follow.
- There are 11 hard-coded colors and no custom properties. `#666` appears 9 times and `#333` 7 times.
- Fixed in T2: there were 23 separate `@media (max-width: 1024px)` blocks, written desktop-first, and one `!important` that only existed to win against a rule later in the file.
- Fixed in T2: `.nav-arrow`, `.share-button`, and `.notifications-button` repeated about 15 declarations each, and the arrows and share button were given `position: absolute`, then reset to `static`.
- Fixed in T2: the header, profile, and footer used a translucent white background with `backdrop-filter: blur(10px)`, though nothing ever scrolls behind them. The toast keeps its blur, because it floats over the page.
- Fixed in T2: dead code, namely the `.footer .separator` rule, `calendarIcon()`, `scroll-behavior: smooth`, and vendor prefixes such as `-khtml-user-drag`.
- The toast types `info`, `success`, and `error` have no styles, so they look the same. `.toast.show` sets the same `transform` as `.toast`, so only opacity animates.
- Accessibility:
  - `user-scalable=no` blocks pinch zoom, which fails WCAG 1.4.4.
  - Every `env(safe-area-inset-*)` value is 0, because the viewport tag lacks `viewport-fit=cover`.
  - There is no `:focus-visible` style and no `prefers-reduced-motion` handling.
- [404.html](../assets/404.html) is the default Firebase page, with its own palette and text about the Firebase CLI.
- Before T1, [template.test.ts](../functions/src/day-page/template.test.ts) checked for CSS text such as `.notifications-button {` and `width: 48px`. It now checks markup only.

## Design

### Stylesheet

- All CSS lives in `assets/styles.css`. The build already copies `assets/*` to `public/`, so Hosting serves it at `/styles.css`.
- Every page links it in `<head>` with `<link rel="stylesheet" href="/styles.css">`, including `404.html`. The processing page's spinner rules move into the same file.
- Hosting sends its default `Cache-Control: max-age=3600` for static files and clears its CDN on deploy. A CSS change can therefore take up to an hour to reach a browser that already has the old file. That is acceptable for this site; see [Open questions](#open-questions) for a fingerprinted name.
- Prettier formats the file. Stylelint can be added later without code changes.

File order, one section per component:

1. Tokens (`:root`, then the dark overrides)
2. Base (`html`, `body`, links, focus)
3. Layout (`.page`, `.header`, `.footer`)
4. Components (`.icon-button`, `.user-profile`, `.tag`, `.photo`, `.toast`, `.spinner`)
5. Utilities (`.hidden`)
6. Preference queries (`prefers-reduced-motion`)

### Tokens

Every color in `styles.css` is a `var(--…)`. Hex and `rgb()` values appear only where tokens are defined.

| Token             | Light                 | Dark                     | Used for                                  |
| ----------------- | --------------------- | ------------------------ | ----------------------------------------- |
| `--bg`            | `#ffffff`             | `#121212`                | Page background                           |
| `--surface`       | `#ffffff`             | `#1e1e1e`                | Header, profile, footer                   |
| `--text`          | `#333333`             | `#e6e6e6`                | Title, names, icons on hover              |
| `--text-muted`    | `#666666`             | `#a3a3a3`                | Usernames, likes, footer text, icons      |
| `--border`        | `rgb(0 0 0 / 10%)`    | `rgb(255 255 255 / 12%)` | Header bottom border                      |
| `--hover`         | `#f0f0f0`             | `#2a2a2a`                | Icon button and tag hover, tag background |
| `--active`        | `#e0e0e0`             | `#333333`                | Icon button and tag pressed               |
| `--link`          | `#007acc`             | `#4db3ff`                | Footer links                              |
| `--link-hover`    | `#005599`             | `#80c8ff`                | Footer links on hover                     |
| `--focus`         | `#007acc`             | `#4db3ff`                | Focus outline                             |
| `--toast-bg`      | `rgb(64 64 64 / 95%)` | `rgb(235 235 235 / 95%)` | Toast background                          |
| `--toast-text`    | `#f5f5f5`             | `#1f1f1f`                | Toast text                                |
| `--success`       | `#81c784`             | `#2e7d32`                | Success toast accent                      |
| `--error`         | `#ef9a9a`             | `#c62828`                | Error toast accent                        |
| `--spinner-track` | `#f0f0f0`             | `#2a2a2a`                | Spinner ring                              |
| `--spinner-head`  | `#666666`             | `#a3a3a3`                | Spinner moving segment                    |

The light values are today's colors, so moving to tokens changes nothing visible. The tag pressed state (`#d0d0d0` today) uses `--active`. The toast is dark in the light theme and light in the dark theme, so its accents are the light colors in the light theme and the reverse.

Contrast, computed with the WCAG formula. Text needs 4.5:1, and the toast accent borders need 3:1 (WCAG 1.4.11). Translucent toast backgrounds are blended over `--bg` first.

| Pair                               | Light  | Dark   |
| ---------------------------------- | ------ | ------ |
| `--text` on `--surface`            | 12.6:1 | 13.4:1 |
| `--text-muted` on `--surface`      | 5.7:1  | 6.6:1  |
| `--text-muted` on `--hover` (tags) | 5.0:1  | 5.7:1  |
| `--link` on `--surface`            | 4.5:1  | 7.3:1  |
| `--toast-text` on `--toast-bg`     | 8.1:1  | 12.5:1 |
| `--success` on `--toast-bg`        | 4.4:1  | 3.9:1  |
| `--error` on `--toast-bg`          | 4.1:1  | 4.3:1  |

The light `--link` (today's `#007acc`) passes with no margin, at 4.51:1. Any change to it must be rechecked.

### Dark theme

- `:root` sets `color-scheme: light dark`. The page also adds `<meta name="color-scheme" content="light dark">`, so the browser paints the right background before the stylesheet arrives and themes scrollbars and form controls.
- `@media (prefers-color-scheme: dark) { :root { … } }` overrides the token values. This works in every browser the site supports. `light-dark()` would be shorter, but it only became broadly available in 2024.
- Two `<meta name="theme-color">` tags, one per `media="(prefers-color-scheme: …)"`, set the mobile browser toolbar to `--surface`.
- Icons use `fill="currentColor"` and pick up `--text-muted`, or `--text` on hover. This also fixes hover feedback on the icons.
- Photos and avatars are shown unchanged. Dimming photos in dark mode was considered and rejected, because the photo is the content.
- The server renders the same HTML for both themes. The choice happens entirely in the browser, so the 1 s page caching and the CDN keep working.

### Layout and components

- **Page:** `.page` replaces the three-column container. It is a single column with `max-width: 1024px; margin-inline: auto` and `height: 100vh; height: 100dvh`. It has to be a fixed `height`, not `min-height`: the photo area is a flex child that fills the remaining space and clips the photo to the viewport. The empty `.left-column` and `.right-column` elements go away.
- **Header:** a grid with `grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)`. The arrows sit in the left cell, the title in the middle, and the notifications and share buttons in the right cell. Nothing is absolutely positioned, so the title can't overlap the controls on narrow screens. The two button groups have `height: 0`, and their 44–48 px buttons overflow the row, centered. This keeps the header's height set by the title, as it was before.
- **`.icon-button`:** one class for the previous and next arrows, the notifications button, and the share button. It sets the 44 px circle (48 px on small screens), centering, hover and active colors, and the pressed scale. `.nav-arrow`, `.share-button`, and `.notifications-button` keep only what is specific to them. The JavaScript keeps using the existing IDs and classes.
- **Surfaces:** the header, profile, and footer use solid `--surface` with no `backdrop-filter`.
- **User profile:** the inline `style` attribute becomes a `.user-summary` class.
- **Photo:** the image gets `draggable="false"` and keeps `user-select: none`. The old drag prefixes go away.
- **Toast:** `success` and `error` get a 4 px left border in `--success` or `--error`, and `info` has none. The hidden state is `translate(-50%, -8px)` and the shown state is `translate(-50%, 0)`, so it slides in. The transition lists `opacity`, `transform`, and `visibility` instead of `all`.
- **Breakpoints:** mobile-first. Base rules are the current small-screen values, and one `@media (min-width: 1025px)` section holds the larger values. This keeps today's 1024 px switch point and removes the `!important`. Font sizes that differ by 1–2 px between the two could later use `clamp()`, but that changes sizes between the breakpoints, so it isn't part of T2.

### Accessibility

- **Zoom:** the viewport tag drops `user-scalable=no`. Links and buttons keep `touch-action: manipulation`, which already stops double-tap zoom, and the `*` rule goes away.
- **Safe areas:** the viewport tag adds `viewport-fit=cover`, so the existing `env(safe-area-inset-*)` padding takes effect on iPhones in landscape. The `@supports (padding: max(0px))` wrapper goes away, because every supported browser has `max()`.
- **Focus:** `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` for links and buttons.
- **Motion:** under `prefers-reduced-motion: reduce`, transitions and the pressed scale are removed, and the toast appears without sliding. The spinner keeps turning, because it is the only sign that the page is working.

### 404 page

`404.html` links `/styles.css`, uses the same tokens, header style, and footer, and so gets the dark theme too. It keeps one link back to `/`. The Firebase CLI text goes away.

## Invariants

- Every color in `styles.css` comes from a token. Tokens are defined in `:root` and overridden only in the dark media query.
- Every token defined for light is also defined for dark.
- Every text pair listed under [Tokens](#tokens) meets 4.5:1 in both themes, and every accent meets 3:1.
- Icons never set their own fill color.
- The server output is the same for both themes.

## Testing

- A unit test reads `assets/styles.css` and fails if:
  - a hex or `rgb()` color appears outside the token blocks;
  - a `var(--x)` is used but not defined;
  - a token is defined in `:root` but missing from the dark block.
- A unit test checks that the SVGs in `svg.ts` use `currentColor`.
- [template.test.ts](../functions/src/day-page/template.test.ts) stops checking CSS text. It checks markup instead: the stylesheet link, the `color-scheme` and `theme-color` tags, and the classes that `src/notifications.ts` and `src/toast.ts` depend on (`hidden`, `show`, `notifications-on`, `notifications-off`, `toast`).
- Manual check for each milestone: in the emulator (`npm start`), open a photo page, a processing page, and the 404 page, with the browser's developer tools set to light, dark, and reduced motion, at widths 375 px and 1280 px.

## Milestones

Each one is a separate PR with `npm run build`, `npm test`, and `npm test --prefix functions` passing.

### T1. Move the CSS into a stylesheet (done)

1. Create `assets/styles.css` with the current rules, unchanged, including the spinner rules.
2. Replace both `<style>` blocks in `template.ts` with the stylesheet link.
3. Replace the CSS-text assertions in `template.test.ts` with markup checks.

No visual change. A whitespace-insensitive comparison confirmed the stylesheet holds exactly the old rules, in the old order.

### T2. Clean up (done)

1. Remove the dead code: `.footer .separator`, `calendarIcon()`, `scroll-behavior`, the old vendor prefixes, and the `position: absolute` rules that are reset later.
2. Add `.icon-button`, the grid header, `.page`, and `.user-summary`. Remove the empty column elements.
3. Rewrite the media queries mobile-first, which removes the `!important`.
4. Replace the translucent surfaces and `backdrop-filter` with solid colors.

No intended visual change. The surfaces become fully opaque, which only matters where something could show through, and nothing does.

What the rewrite had to preserve, because the old rules overrode each other:

- On small screens the header's padding is really 15 px on all sides, not the 10 px in its media query, because the safe-area block later in the file overrode it.
- The footer's padding is 10 px top, 15 px bottom, and 20 px on the sides at every width, for the same reason.
- The notifications button keeps its `font-size` (18 px, or 20 px on desktop), because the icon spans inside it are positioned by their line height.
- The image keeps `-webkit-user-drag` behavior through `draggable="false"` on the element.

How it was checked: a script rendered the photo and processing pages from T1 and T2 with the same data, in headless Chromium at widths 375, 768, 1024, 1025, 1100, 1280, and 1281 px. It compared the position and size of every key element, the hover colors, and full-page screenshots. The photo page matched pixel for pixel at every width. The processing page matched except for 24 pixels of anti-aliasing in the title text, at widths where the 1024 px column is centered on a half pixel (1025, 1027, 1281). The title's position is identical to 1/64 px in both versions; the difference comes from the new markup, not the CSS.

### T3. Tokens

1. Add the token blocks with the light values only, and replace every color with a token.
2. Switch the icons to `fill="currentColor"`.
3. Add the stylesheet and icon tests.

The only visual change is that icons now follow hover colors.

### T4. Dark theme

1. Add the dark token values, `color-scheme`, and the `theme-color` tags.
2. Restyle `404.html` on the shared stylesheet.

### T5. Accessibility and polish

1. Viewport changes: allow zoom and add `viewport-fit=cover`.
2. Add the `:focus-visible` outline and the `prefers-reduced-motion` rules.
3. Add the toast type accents and the slide-in.

## Open questions

1. **Manual theme switch.** It would need a `data-theme` attribute on `<html>`, a small script in `<head>` that reads `localStorage` before the first paint, and a header button. The server can't help, because browsers don't send the preference by default, and `Sec-CH-Prefers-Color-Scheme` would mean caching two versions of every page. Not planned unless visitors ask for it.
2. **Fingerprinted stylesheet.** Naming the file `styles.<hash>.css` with a long cache would remove the one-hour window after a deploy. It needs the build to write the hash where `template.ts` can read it. Worth doing only if stale CSS causes a visible problem.
3. **Breakpoint.** 1024 px sends landscape tablets the phone layout. Moving it to 768 px is a visual change, so it is left for after T5.
4. **Visual regression tests.** The repo has no browser tests. Playwright screenshots of the three pages in both themes would catch regressions that unit tests can't, at the cost of a new CI dependency.
