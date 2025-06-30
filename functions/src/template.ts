import { html, TemplateResult } from 'lit-html';
import {
  backIcon,
  heartIcon,
  nextIcon,
  notificationsOffIcon,
  notificationsOnIcon,
  shareIcon,
} from './svg';

interface TemplateData {
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
  nextDateUrl: string;
  showNextArrow: boolean;
}

function renderTags(tags: Array<{ type: string; title: string }>) {
  return tags
    .slice(0, 5)
    .map(
      (tag) =>
        html`<a
          href="https://unsplash.com/s/photos/${encodeURIComponent(tag.title)}"
          class="tag"
          >${tag.title}</a
        >`
    );
}

function renderNextArrow(showNextArrow: boolean, nextDateUrl: string) {
  return showNextArrow
    ? html`<a href="${nextDateUrl}" class="nav-arrow right" title="Next"
        >${nextIcon()}</a
      >`
    : '';
}

function renderHeader(data: TemplateData): TemplateResult {
  return html`
    <div class="header">
      <div class="nav-arrows-left">
        <a href="${data.prevDateUrl}" class="nav-arrow left" title="Previous"
          >${backIcon()}</a
        >
        ${renderNextArrow(data.showNextArrow, data.nextDateUrl)}
      </div>
      <h1><a href="/" class="header-title">Daily Cat</a></h1>
      <div class="header-controls">
        <button
          id="notifications-button"
          class="notifications-button hidden"
          title="Toggle notifications"
          type="button"
        >
          <span class="notifications-on hidden">${notificationsOnIcon()}</span>
          <span class="notifications-off">${notificationsOffIcon()}</span>
        </button>
        <button
          id="share-button"
          class="share-button hidden"
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
        <div style="display: flex; align-items: center; gap: 12px">
          <img src="${data.userProfileImage}" alt="User profile" />
          <div class="user-info">
            <div class="user-name">${data.userName}</div>
            <a href="${data.userProfileUrl}" class="user-username"
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
      <a href="${data.linkUrl}">
        <img
          class="cat-image"
          src="${data.imageUrl}"
          alt="${data.altDescription}"
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
      <div class="container">
        <div class="left-column"></div>
        <div class="center-column">
          ${renderHeader(data)} ${children} ${renderFooter()}
        </div>
        <div class="right-column"></div>
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
          content="width=device-width, initial-scale=1.0, user-scalable=no"
        />
        <title>Daily Cat</title>

        <!-- Open Graph tags for social media sharing -->
        <meta property="og:title" content="Daily Cat" />
        <meta
          property="og:description"
          content="Your daily dose of adorable cat photos"
        />
        <meta property="og:image" content="/images/cat.png" />
        <meta
          property="og:image:alt"
          content="Daily Cat - Adorable cat photo"
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Daily Cat" />

        <!-- Twitter Card tags -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Daily Cat" />
        <meta
          name="twitter:description"
          content="Your daily dose of adorable cat photos"
        />
        <meta name="twitter:image" content="/images/cat.png" />
        <meta
          name="twitter:image:alt"
          content="Daily Cat - Adorable cat photo"
        />
        <script src="/index.js" defer></script>
        <style>
          html,
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family:
              -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
              Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .container {
            display: flex;
            width: 100%;
            height: 100vh;
          }
          .left-column,
          .right-column {
            flex: 1;
          }
          @media (max-width: 768px) {
            .left-column,
            .right-column {
              display: none;
            }
            .center-column {
              flex: 1;
            }
            .container {
              height: 100dvh; /* Dynamic viewport height for mobile browsers */
            }
          }
          .center-column {
            flex: 2;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          @media (max-width: 768px) {
            .center-column {
              min-height: 100dvh;
            }
          }
          .header {
            background-color: rgba(255, 255, 255, 0.95);
            padding: 20px;
            text-align: center;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          }
          @media (max-width: 768px) {
            .header {
              padding: 15px 10px;
              min-height: 44px; /* iOS touch target size */
            }
          }
          .header h1 {
            color: #333;
            font-family: inherit;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          @media (max-width: 768px) {
            .header h1 {
              font-size: 20px;
            }
          }
          .header-title {
            color: inherit;
            text-decoration: none;
            transition: opacity 0.2s ease;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          .header-title:hover {
            opacity: 0.8;
          }
          .header-title:active {
            opacity: 0.6;
          }
          .nav-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            font-size: 24px;
            color: #666;
            text-decoration: none;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition:
              background-color 0.2s ease,
              color 0.2s ease;
            /* Better touch targets for mobile */
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          @media (max-width: 768px) {
            .nav-arrow {
              width: 48px;
              height: 48px;
              font-size: 20px;
            }
          }
          .nav-arrow:hover {
            background-color: #f0f0f0;
            color: #333;
          }
          .nav-arrow:active {
            background-color: #e0e0e0;
            transform: scale(0.95);
          }
          .nav-arrows-left {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .nav-arrow.left {
            position: static;
            transform: none;
          }
          .nav-arrow.right {
            position: static;
            transform: none;
          }
          @media (max-width: 768px) {
            .nav-arrows-left {
              left: 10px;
            }
          }
          .share-button {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 20px;
            color: #666;
            text-decoration: none;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition:
              background-color 0.2s ease,
              color 0.2s ease;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            border: none;
            background: none;
            cursor: pointer;
          }
          .header-controls {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .notifications-button {
            font-size: 20px;
            color: #666;
            text-decoration: none;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition:
              background-color 0.2s ease,
              color 0.2s ease;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            border: none;
            background: none;
            cursor: pointer;
            position: relative;
          }
          .notifications-button .notifications-on,
          .notifications-button .notifications-off {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: opacity 0.2s ease;
          }
          .share-button {
            position: static;
            transform: none;
          }
          @media (max-width: 768px) {
            .share-button {
              width: 48px;
              height: 48px;
              font-size: 18px;
              right: 10px;
            }
            .header-controls {
              right: 10px;
            }
            .notifications-button {
              width: 48px;
              height: 48px;
              font-size: 18px;
            }
          }
          .share-button:hover {
            background-color: #f0f0f0;
            color: #333;
          }
          .share-button:active {
            background-color: #e0e0e0;
            transform: translateY(-50%) scale(0.95);
          }
          .notifications-button:hover {
            background-color: #f0f0f0;
            color: #333;
          }
          .notifications-button:active {
            background-color: #e0e0e0;
            transform: scale(0.95);
          }
          .hidden {
            display: none;
          }
          .user-profile {
            background-color: rgba(255, 255, 255, 0.95);
            padding: 15px 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          @media (max-width: 768px) {
            .user-profile {
              padding: 12px 15px;
            }
          }
          .user-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }
          @media (max-width: 768px) {
            .user-row {
              flex-direction: column;
              align-items: stretch;
              gap: 12px;
            }
            .right-section {
              align-items: flex-start !important;
            }
          }
          .right-section {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
          }
          .user-profile img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
          }
          @media (max-width: 768px) {
            .user-profile img {
              width: 36px;
              height: 36px;
            }
          }
          .user-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .user-name {
            font-family: inherit;
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 0;
            line-height: 1.2;
          }
          @media (max-width: 768px) {
            .user-name {
              font-size: 15px;
            }
          }
          .user-username {
            font-family: inherit;
            font-size: 14px;
            color: #666;
            margin: 0;
            text-decoration: none;
            line-height: 1.2;
            -webkit-tap-highlight-color: transparent;
          }
          @media (max-width: 768px) {
            .user-username {
              font-size: 13px;
            }
          }
          .user-username:hover {
            color: #333;
            text-decoration: underline;
          }
          .likes-count {
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: inherit;
            color: #666;
            line-height: 1.2;
          }
          .likes-count svg {
            width: 20px;
            height: 20px;
            vertical-align: middle;
          }
          .likes-count span {
            vertical-align: middle;
          }
          @media (max-width: 768px) {
            .likes-count {
              font-size: 16px;
            }
            .likes-count svg {
              width: 18px;
              height: 18px;
            }
          }
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          @media (max-width: 768px) {
            .tags {
              gap: 4px;
            }
          }
          .tag {
            background-color: #f0f0f0;
            color: #666;
            font-family: inherit;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 12px;
            white-space: nowrap;
            text-decoration: none;
            display: inline-block;
            line-height: 1.2;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          @media (max-width: 768px) {
            .tag {
              font-size: 11px;
              padding: 3px 6px;
              border-radius: 10px;
            }
          }
          .tag:hover {
            background-color: #e0e0e0;
            color: #333;
          }
          .tag:active {
            background-color: #d0d0d0;
            transform: scale(0.95);
          }
          .photo-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
          }
          .photo-container a {
            display: flex;
            align-items: center;
            justify-content: center;
            -webkit-tap-highlight-color: transparent;
            margin: 0 5px;
          }
          .cat-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
            transition: transform 0.2s ease;
            /* Prevent image selection on mobile */
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            /* Prevent image dragging */
            -webkit-user-drag: none;
            -khtml-user-drag: none;
            -moz-user-drag: none;
            -o-user-drag: none;
          }
          @media (max-width: 768px) {
            .cat-image {
              /* Better image handling for mobile */
              width: auto;
              height: auto;
              max-width: 100%;
              max-height: 100%;
              margin: 0 8px;
            }
          }

          /* Smooth scrolling for the whole page */
          html {
            scroll-behavior: smooth;
          }

          /* Prevent zoom on double tap for iOS */
          @media (max-width: 768px) {
            * {
              touch-action: manipulation;
            }
          }

          /* Footer styles */
          .footer {
            background-color: rgba(255, 255, 255, 0.95);
            padding: 10px 5px;
            text-align: center;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            font-size: 14px;
            color: #666;
          }

          .footer a {
            color: #007acc;
            text-decoration: none;
            transition: color 0.2s ease;
            margin: 0 4px;
          }

          .footer a:hover {
            color: #005599;
            text-decoration: underline;
          }

          .footer .separator {
            color: #ccc;
          }

          @media (max-width: 768px) {
            .footer {
              padding: 10px 5px;
              font-size: 13px;
            }
          }

          /* Handle safe areas for devices with notches */
          @supports (padding: max(0px)) {
            .header {
              padding-left: max(20px, env(safe-area-inset-left));
              padding-right: max(20px, env(safe-area-inset-right));
              padding-top: max(20px, env(safe-area-inset-top));
            }
            .user-profile {
              padding-left: max(20px, env(safe-area-inset-left));
              padding-right: max(20px, env(safe-area-inset-right));
            }
            .footer {
              padding-left: max(20px, env(safe-area-inset-left));
              padding-right: max(20px, env(safe-area-inset-right));
              padding-bottom: max(15px, env(safe-area-inset-bottom));
            }
            @media (max-width: 768px) {
              .header {
                padding-left: max(15px, env(safe-area-inset-left));
                padding-right: max(15px, env(safe-area-inset-right));
                padding-top: max(15px, env(safe-area-inset-top));
              }
              .user-profile {
                padding-left: max(15px, env(safe-area-inset-left));
                padding-right: max(15px, env(safe-area-inset-right));
              }
              .nav-arrows-left {
                left: max(10px, env(safe-area-inset-left));
              }
              .share-button {
                right: max(10px, env(safe-area-inset-right));
              }
              .header-controls {
                right: max(10px, env(safe-area-inset-right));
              }
            }
          }
        </style>
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
    <style>
      .loading-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        padding: 40px 20px;
      }

      .loading-spinner {
        position: relative;
        width: 60px;
        height: 60px;
      }

      .spinner {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 4px solid #f0f0f0;
        border-top: 4px solid #666;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        font-family: inherit;
        font-size: 16px;
        color: #666;
        text-align: center;
        line-height: 1.4;
      }

      @media (max-width: 768px) {
        .loading-container {
          gap: 16px;
          padding: 30px 15px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
        }

        .loading-text {
          font-size: 15px;
        }
      }
    </style>
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
