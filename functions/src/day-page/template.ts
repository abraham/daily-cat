// Server-only templates: no hydration markers, and bindings work in <title>.
import { html, ServerRenderedTemplate as TemplateResult } from '@lit-labs/ssr';
import {
  backIcon,
  heartIcon,
  nextIcon,
  notificationsOffIcon,
  notificationsOnIcon,
  shareIcon,
} from './svg';

/** Per-page title and link-preview details. All URLs are absolute. */
export interface PageMeta {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  imageAlt: string;
}

export interface TemplateData {
  meta: PageMeta;
  linkUrl: string;
  imageUrl: string;
  userProfileImage: string;
  userName: string;
  userUsername: string;
  userProfileUrl: string;
  likesCount: string;
  altDescription: string;
  tags: Array<{ type: string; title: string }>;
  prevDateUrl: string;
  showPrevArrow: boolean;
  nextDateUrl: string;
  showNextArrow: boolean;
}

function renderTags(tags: Array<{ type: string; title: string }>) {
  return tags
    .slice(0, 5)
    .map(
      (tag) =>
        html`<a
          href="https://unsplash.com/s/photos/${encodeURIComponent(
            tag.title
          )}?utm_source=daily.cat&utm_medium=referral"
          class="tag"
          >${tag.title}</a
        >`
    );
}

function renderPrevArrow(showPrevArrow: boolean, prevDateUrl: string) {
  return showPrevArrow
    ? html`<a
        href="${prevDateUrl}"
        class="icon-button nav-arrow left"
        title="Previous"
        >${backIcon()}</a
      >`
    : '';
}

function renderNextArrow(showNextArrow: boolean, nextDateUrl: string) {
  return showNextArrow
    ? html`<a
        href="${nextDateUrl}"
        class="icon-button nav-arrow right"
        title="Next"
        >${nextIcon()}</a
      >`
    : '';
}

function renderHeader(data: TemplateData): TemplateResult {
  return html`
    <div class="header">
      <div class="nav-arrows-left">
        ${renderPrevArrow(data.showPrevArrow, data.prevDateUrl)}
        ${renderNextArrow(data.showNextArrow, data.nextDateUrl)}
      </div>
      <h1><a href="/" class="header-title">Daily Cat</a></h1>
      <div class="header-controls">
        <button
          id="notifications-button"
          class="icon-button notifications-button hidden"
          title="Toggle notifications"
          type="button"
        >
          <span class="notifications-on hidden">${notificationsOnIcon()}</span>
          <span class="notifications-off">${notificationsOffIcon()}</span>
        </button>
        <button
          id="share-button"
          class="icon-button share-button hidden"
          title="Share this page"
          type="button"
        >
          ${shareIcon()}
        </button>
      </div>
    </div>
  `;
}

function renderUserProfile(data: TemplateData): TemplateResult {
  return html`
    <div class="user-profile">
      <div class="user-row">
        <div class="user-summary">
          <img src="${data.userProfileImage}" alt="User profile" />
          <div class="user-info">
            <div class="user-name">${data.userName}</div>
            <a
              href="${data.userProfileUrl}?utm_source=daily.cat&utm_medium=referral"
              class="user-username"
              >@${data.userUsername}</a
            >
          </div>
        </div>
        <div class="right-section">
          <div class="likes-count">
            <span>${heartIcon()}</span>
            <span>${data.likesCount}</span>
          </div>
          <div class="tags">${renderTags(data.tags || [])}</div>
        </div>
      </div>
    </div>
  `;
}

function renderPhoto(data: TemplateData): TemplateResult {
  return html`
    <div class="photo-container">
      <a href="${data.linkUrl}?utm_source=daily.cat&utm_medium=referral">
        <img
          class="cat-image"
          src="${data.imageUrl}"
          alt="${data.altDescription}"
          draggable="false"
        />
      </a>
    </div>
  `;
}

function renderFooter(): TemplateResult {
  return html`
    <div class="footer">
      <a
        href="https://github.com/abraham/daily-cat"
        target="_blank"
        rel="noopener noreferrer"
        >Made</a
      >
      by
      <a href="https://abrah.am" target="_blank" rel="noopener noreferrer"
        >abrah.am</a
      >
      with
      <a href="https://unsplash.com/" target="_blank" rel="noopener noreferrer"
        >Unsplash</a
      >
      and
      <a href="https://undraw.co/" target="_blank" rel="noopener noreferrer"
        >unDraw</a
      >
    </div>
  `;
}

function renderBody(
  data: TemplateData,
  children: TemplateResult
): TemplateResult {
  return html`
    <body>
      <div id="toast" class="toast"></div>
      <div class="page">
        ${renderHeader(data)} ${children} ${renderFooter()}
      </div>
      <script>
        // Check if Web Share API is supported and show share button
        if (navigator.share) {
          const shareButton = document.getElementById('share-button');
          if (shareButton) {
            shareButton.classList.remove('hidden');

            shareButton.addEventListener('click', async function () {
              try {
                await navigator.share({
                  title: 'Daily Cat',
                  text: 'Check out this adorable cat photo from Daily Cat!',
                  url: window.location.href,
                });
              } catch (error) {
                // User cancelled or error occurred
                console.log('Error sharing:', error);
              }
            });
          }
        }
      </script>
    </body>
  `;
}

function renderMetaTags(meta: PageMeta): TemplateResult {
  return html`
    <link rel="canonical" href="${meta.url}" />

    <!-- Open Graph tags for social media sharing -->
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url" content="${meta.url}" />
    <meta property="og:image" content="${meta.imageUrl}" />
    <meta property="og:image:alt" content="${meta.imageAlt}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Daily Cat" />

    <!-- Twitter Card tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />
    <meta name="twitter:image" content="${meta.imageUrl}" />
    <meta name="twitter:image:alt" content="${meta.imageAlt}" />
  `;
}

function renderPage(
  data: TemplateData,
  children: TemplateResult
): TemplateResult {
  return html`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <meta name="color-scheme" content="light dark" />
        <!-- Toolbar colors; must match --surface in styles.css (tested). -->
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#1e1e1e"
        />
        <title>${data.meta.title}</title>
        <link rel="icon" type="image/png" href="/images/cat-face-small.png" />
        ${renderMetaTags(data.meta)}
        <script src="/index.js" defer></script>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      ${renderBody(data, children)}
    </html>
  `;
}

function renderLoadingAnimation(): TemplateResult {
  return html`
    <div class="loading-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
      <div class="loading-text">Processing your request...</div>
    </div>
  `;
}

function renderProcessingPageContent(): TemplateResult {
  return html`
    ${renderLoadingAnimation()}
    <script>
      (function () {
        // Get current URL and parse attempt parameter
        const url = new URL(window.location.href);
        const currentAttempt = parseInt(url.searchParams.get('attempt') || '0');

        // Only refresh if we haven't exceeded max attempts (10)
        if (currentAttempt < 10) {
          setTimeout(function () {
            // Increment attempt and add to URL
            url.searchParams.set('attempt', (currentAttempt + 1).toString());
            window.location.href = url.toString();
          }, 2000); // 2 seconds delay
        } else {
          // After 10 attempts, show a message that processing is taking longer
          setTimeout(function () {
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) {
              loadingText.innerHTML =
                'Processing is taking longer than expected. You can manually refresh this page or try again later.';
            }
          }, 500);
        }
      })();
    </script>
  `;
}

export function renderProcessingPage(data: TemplateData): TemplateResult {
  return renderPage(data, renderProcessingPageContent());
}

function renderPhotoPageContent(data: TemplateData): TemplateResult {
  return html`${renderUserProfile(data)} ${renderPhoto(data)}`;
}

export function renderPhotoPage(data: TemplateData): TemplateResult {
  return renderPage(data, renderPhotoPageContent(data));
}
