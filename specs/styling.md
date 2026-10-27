# Styling and dark theme

Part of the [architecture overview](README.md). Status: all milestones, T1 to T5, are **done**. Nothing else is planned; see [Not planned](#not-planned).

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

- A manual light/dark switch. See [Not planned](#not-planned).
- A redesign. Sizes, spacing, and the light palette stay as they are.
- A CSS framework or a build step for CSS.

## Current state

- Since T1, all CSS lives in [assets/styles.css](../assets/styles.css), which every day page links from `<head>`. Since T4, so does `404.html`.
- Before T1, about 550 lines of CSS sat inside the `renderPage()` template literal in [template.ts](../functions/src/day-page/template.ts) and were re-sent with almost every request. The processing page also emitted a second `<style>` block inside `<body>` for the spinner.
- Since T2, the stylesheet is organized by section and mobile-first, with one `@media (min-width: 1025px)` block and no `!important`. The header, footer, and profile are solid white, the icon buttons share `.icon-button`, and the dead code is gone. It went from 625 to 458 lines. The bullets below that describe the old structure are kept for the record and marked as fixed.
- Fixed in T3: [svg.ts](../functions/src/day-page/svg.ts) hard-coded icon fills (`#333` and `#1f1f1f`), so the icons didn't follow the buttons' hover color. They now use `currentColor`.
- Fixed in T3: there were 11 hard-coded colors and no custom properties. Every color is now a token defined in `:root`.
- Fixed in T2: there were 23 separate `@media (max-width: 1024px)` blocks, written desktop-first, and one `!important` that only existed to win against a rule later in the file.
- Fixed in T2: `.nav-arrow`, `.share-button`, and `.notifications-button` repeated about 15 declarations each, and the arrows and share button were given `position: absolute`, then reset to `static`.
- Fixed in T2: the header, profile, and footer used a translucent white background with `backdrop-filter: blur(10px)`, though nothing ever scrolls behind them. The toast keeps its blur, because it floats over the page.
- Fixed in T2: dead code, namely the `.footer .separator` rule, `calendarIcon()`, `scroll-behavior: smooth`, and vendor prefixes such as `-khtml-user-drag`.
- Fixed in T5: the toast types `info`, `success`, and `error` had no styles, so they looked the same, and `.toast.show` set the same `transform` as `.toast`, so only opacity animated.
- Fixed in T5, accessibility:
  - `user-scalable=no` blocked pinch zoom, which fails WCAG 1.4.4.
  - Every `env(safe-area-inset-*)` value was 0, because the viewport tag lacked `viewport-fit=cover`.
  - There was no `:focus-visible` style and no `prefers-reduced-motion` handling.
- Fixed in T4: [404.html](../assets/404.html) was the default Firebase page, with its own palette and text about the Firebase CLI.
- Since T4, every page follows the system light or dark setting.
- Before T1, [template.test.ts](../functions/src/day-page/template.test.ts) checked for CSS text such as `.notifications-button {` and `width: 48px`. It now checks markup only.

## Design

### Stylesheet

- All CSS lives in `assets/styles.css`. The build already copies `assets/*` to `public/`, so Hosting serves it at `/styles.css`.
- Every page links it in `<head>` with `<link rel="stylesheet" href="/styles.css">`, including `404.html`. The processing page's spinner rules move into the same file.
- Hosting sends its default `Cache-Control: max-age=3600` for static files and clears its CDN on deploy. A CSS change can therefore take up to an hour to reach a browser that already has the old file. That is acceptable for this site, so the file name is not fingerprinted; see [Not planned](#not-planned).
- Prettier formats the file. Stylelint can be added later without code changes.

File order, one section per concern:

1. Tokens (`:root`, then the dark overrides)
2. Base (`html`, `body`, touch handling, focus)
3. Layout (`.page`, `.header`, `.footer`)
4. Components (`.icon-button`, `.user-profile`, `.tag`, `.photo-container`, `.toast`, `.spinner`, `.not-found`)
5. Larger screens (`@media (min-width: 1025px)`)
6. Reduced motion (`@media (prefers-reduced-motion: reduce)`)
7. Utilities (`.hidden`), last so it wins over the components' `display` values

### Tokens

Every color in `styles.css` is a `var(--…)`. Hex and `rgb()` values appear only where tokens are defined.

| Token             | Light                 | Dark                     | Used for                             |
| ----------------- | --------------------- | ------------------------ | ------------------------------------ |
| `--bg`            | `#ffffff`             | `#121212`                | Page background                      |
| `--surface`       | `#ffffff`             | `#1e1e1e`                | Header, profile, footer              |
| `--text`          | `#333333`             | `#e6e6e6`                | Title, names, icons on hover         |
| `--text-muted`    | `#666666`             | `#a3a3a3`                | Usernames, likes, footer text, icons |
| `--border`        | `rgb(0 0 0 / 10%)`    | `rgb(255 255 255 / 12%)` | Header bottom border                 |
| `--hover`         | `#f0f0f0`             | `#2a2a2a`                | Icon button hover, tag background    |
| `--active`        | `#e0e0e0`             | `#333333`                | Icon button pressed, tag hover       |
| `--pressed`       | `#d0d0d0`             | `#3d3d3d`                | Tag pressed                          |
| `--link`          | `#007acc`             | `#4db3ff`                | Footer links                         |
| `--link-hover`    | `#005599`             | `#80c8ff`                | Footer links on hover                |
| `--focus`         | `#007acc`             | `#4db3ff`                | Focus outline                        |
| `--toast-bg`      | `rgb(64 64 64 / 95%)` | `rgb(235 235 235 / 95%)` | Toast background                     |
| `--toast-text`    | `#f5f5f5`             | `#1f1f1f`                | Toast text                           |
| `--success`       | `#81c784`             | `#2e7d32`                | Success toast accent                 |
| `--error`         | `#ef9a9a`             | `#c62828`                | Error toast accent                   |
| `--spinner-track` | `#f0f0f0`             | `#2a2a2a`                | Spinner ring                         |
| `--spinner-head`  | `#666666`             | `#a3a3a3`                | Spinner moving segment               |

The light values are today's colors, so moving to tokens changes nothing visible. Tags rest one step darker than icon buttons, so they use three tokens: `--hover` at rest, `--active` on hover, and `--pressed` when pressed. The toast is dark in the light theme and light in the dark theme, so its accents are the light colors in the light theme and the reverse.

Tokens are added when something first uses them: `--focus`, `--success`, and `--error` arrived with the styles that use them in T5.

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
- Two `<meta name="theme-color">` tags, one per `media="(prefers-color-scheme: …)"`, set the mobile browser toolbar to `--surface`. HTML can't read CSS variables, so the two values are written out in `template.ts` and `404.html`, and a test checks they match `--surface`.
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
- **Toast:** `success` and `error` get a 4 px left border in `--success` or `--error`, and `info` has none. The client shows `success` after subscribing and, since T5, `error` when subscribing or unsubscribing fails; it used `info` for failures before. The hidden state is `translate(-50%, -8px)` and the shown state is `translate(-50%, 0)`, so it slides in. The transition lists `opacity`, `transform`, and `visibility` instead of `all`.
- **Breakpoints:** mobile-first. Base rules are the current small-screen values, and one `@media (min-width: 1025px)` section holds the larger values. This keeps today's 1024 px switch point and removes the `!important`. Font sizes that differ by 1–2 px between the two could later use `clamp()`, but that changes sizes between the breakpoints, so it isn't part of T2.

### Accessibility

- **Zoom:** the viewport tag drops `user-scalable=no`. `a` and `button` elements keep `touch-action: manipulation`, which stops double-tap zoom on controls, and the `*` rule goes away. Pinch zoom works everywhere, and double-tap zoom works everywhere except on controls.
- **Safe areas:** the viewport tag adds `viewport-fit=cover`, so the existing `env(safe-area-inset-*)` padding takes effect on iPhones in landscape. The photo area also gets `padding-inline` from the left and right insets, so the photo stays clear of a notch. Every inset is 0 on screens without one, so nothing moves there. (The `@supports (padding: max(0px))` wrapper was already removed in T2.)
- **Focus:** `a:focus-visible, button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`. The outline is 4.5:1 against `--surface` in light and 7.3:1 in dark.
- **Motion:** under `prefers-reduced-motion: reduce`, transitions and the pressed scale are removed, and the toast appears without sliding. The spinner keeps turning, because it is the only sign that the page is working. The rules list the affected classes instead of using `* { transition: none !important }`, which keeps the stylesheet free of `!important`.

### 404 page

`404.html` links `/styles.css` and has the same color-scheme and theme-color tags, so it gets the dark theme too. It uses the site's header (title only, linking to `/`) and footer, and a centered `.not-found` block: the cat-face image, "Page not found", one line of text, and a "See today's cat" link back to `/`. The link is a pill built from the tag tokens (`--hover`, `--active`, `--pressed`). The Firebase CLI text is gone. Hosting serves it with status 404 for any path that matches neither a file nor a rewrite.

The header and footer markup is copied from `template.ts`, because `404.html` is a static file. A change to either must be made in both places.

## Invariants

- Every color in `styles.css` comes from a token. Tokens are defined in `:root` and overridden only in the dark media query.
- Every token defined for light is also defined for dark.
- Every text pair listed under [Tokens](#tokens) meets 4.5:1 in both themes, and every accent meets 3:1.
- Icons never set their own fill color.
- The server output is the same for both themes.

## Testing

- [styles.test.ts](../functions/src/day-page/styles.test.ts) reads `assets/styles.css` and fails if:
  - a hex, `rgb()`, or `hsl()` color appears outside `:root`;
  - a `var(--x)` is used but not defined;
  - a token is defined but never used;
  - a token is defined in `:root` but missing from the dark block, or the other way around.
- The same file checks that every SVG in `svg.ts` uses `fill="currentColor"`, and that both `template.ts` and `404.html` link the stylesheet, have no `<style>`, opt in to both color schemes, set `theme-color` to the light and dark `--surface`, and use the viewport tag that allows zoom.
- [template.test.ts](../functions/src/day-page/template.test.ts) checks rendered markup, not CSS text: the stylesheet link in `<head>`, no inline styles, the `.page` wrapper, and the classes that `src/notifications.ts` and `src/toast.ts` depend on (`hidden`, `notifications-on`, `notifications-off`, `toast`). The `show` class is added by `src/toast.ts` and covered by its own tests.
- `src/notifications.test.ts` checks that both failure toasts use the `error` type.
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

### T3. Tokens (done)

1. Add the token blocks with the light values only, and replace every color with a token.
2. Switch the icons to `fill="currentColor"`.
3. Add the stylesheet and icon tests.

The only visual change is the icons. They take the button's color: `--text-muted` (`#666`) at rest and `--text` (`#333`) on hover. Before T3 they were always `#333`, or `#1f1f1f` for the notification bells and the likes heart, so at rest they are now lighter and they darken on hover. `#666` on white is 5.7:1, well above the 3:1 that icons need.

How it was checked: the same comparison as T2, between T2 and T3. With the icons hidden in both versions, every page matched pixel for pixel at all seven widths, including the tags' rest, hover, and pressed colors. A second script measured each icon's fill at rest and on hover in both versions to confirm the change above.

### T4. Dark theme (done)

1. Add the dark token values, `color-scheme`, and the `theme-color` tags.
2. Restyle `404.html` on the shared stylesheet.

The dark values are the ones in the [Tokens](#tokens) table. Light mode is unchanged.

How it was checked:

- Light mode, compared with T3 using the T2 script at all seven widths: every page matched pixel for pixel.
- Dark mode: screenshots of the photo, processing, and 404 pages at 375 px and 1280 px, reviewed by eye.
- Contrast: a script measured each text element's computed color against the background it actually sits on (translucent layers blended), in both themes, on all three pages. Every one is at least 4.5:1. The lowest are 4.51:1 in light (footer links) and 5.69:1 in dark (tags).
- The Hosting emulator returns the new page with status 404 for an unknown path, and its stylesheet and image load.

### T5. Accessibility and polish (done)

1. Viewport changes: allow zoom and add `viewport-fit=cover`.
2. Add the `:focus-visible` outline and the `prefers-reduced-motion` rules.
3. Add the toast type accents and the slide-in.

New tests: `styles.test.ts` checks that both page types use the new viewport tag, and `src/notifications.test.ts` checks that both failure toasts use `error`.

How it was checked:

- At rest, compared with T4 using the T2 script, in light and dark at all seven widths: every page matched pixel for pixel. The only box difference is the hidden toast, which now starts 8 px higher.
- With the toast shown, it ends where it did before. It is 4 px wider because of the success accent, so it shifts 2 px left to stay centered.
- A script measured, in both themes with and without reduced motion:
  - the toast's hidden position, its transition, and the accent colors (3.9:1 to 4.4:1 against the toast);
  - the icon button transition (0.2 s, or 0 s with reduced motion), and the spinner, which keeps turning either way;
  - `touch-action`: `manipulation` on links, `auto` on the body and other elements;
  - the outline on the first element reached with Tab (2 px solid `--focus`, offset 2 px).
- The success and error toasts were reviewed by eye in both themes.
- The contrast and behavior scripts were rerun in WebKit (Playwright's Safari engine) with the same results. Safari's Tab key skips links and buttons by default, so its focus outline was checked with Option-Tab instead.

## Not planned

These were considered and set aside. The notes record what each would take.

- **Manual theme switch.** It would need a `data-theme` attribute on `<html>`, a small script in `<head>` that reads `localStorage` before the first paint, and a header button. The server can't help, because browsers don't send the preference by default, and `Sec-CH-Prefers-Color-Scheme` would mean caching two versions of every page.
- **Fingerprinted stylesheet.** Naming the file `styles.<hash>.css` with a long cache would remove the one-hour window after a deploy. It needs the build to write the hash where `template.ts` can read it.
- **Breakpoint.** 1024 px sends landscape tablets the phone layout. Moving it to 768 px would be a visual change.
- **Visual regression tests.** The repo has no browser tests. Playwright screenshots of the three pages in both themes would catch regressions that unit tests can't, at the cost of a new CI dependency.
