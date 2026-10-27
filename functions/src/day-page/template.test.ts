import { describe, it, expect } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResultSync } from '@lit-labs/ssr/lib/render-result.js';
import {
  renderMetaTags,
  renderProcessingPage,
  renderPhotoPage,
} from './template';

const pageBase = {
  meta: {
    title: 'Daily Cat: June 28, 2025',
    description: 'A cute cat. Photo by Test User on Unsplash.',
    url: 'https://daily.cat/2025-06-28',
    imageUrl: 'https://images.unsplash.com/test.jpg',
    imageAlt: 'A cute cat',
  },
  showPrevArrow: true,
};

function toHtml(result: ReturnType<typeof renderPhotoPage>): string {
  return collectResultSync(render(result));
}

describe('Template', () => {
  describe('renderMetaTags', () => {
    const tags = () => collectResultSync(render(renderMetaTags(pageBase.meta)));

    it('renders the canonical link and matching Open Graph and Twitter tags', () => {
      const html = tags();

      expect(html).toContain(
        '<link rel="canonical" href="https://daily.cat/2025-06-28" />'
      );
      for (const [og, twitter, value] of [
        ['og:title', 'twitter:title', pageBase.meta.title],
        ['og:description', 'twitter:description', pageBase.meta.description],
        ['og:image', 'twitter:image', pageBase.meta.imageUrl],
        ['og:image:alt', 'twitter:image:alt', pageBase.meta.imageAlt],
      ]) {
        expect(html).toContain(`<meta property="${og}" content="${value}" />`);
        expect(html).toContain(`<meta name="${twitter}" content="${value}" />`);
      }
      expect(html).toContain(
        '<meta property="og:url" content="https://daily.cat/2025-06-28" />'
      );
      expect(html).toContain(
        '<meta name="twitter:card" content="summary_large_image" />'
      );
    });

    it('renders only head elements', () => {
      const elements = tags().match(/<[a-z]+/g) ?? [];

      expect(new Set(elements)).toEqual(new Set(['<link', '<meta']));
    });
  });
  describe('renderProcessingPage', () => {
    it('should include auto-refresh JavaScript for processing page', () => {
      const mockData = {
        ...pageBase,
        linkUrl: '',
        imageUrl: '',
        userProfileImage: '',
        userName: '',
        userUsername: '',
        userProfileUrl: '',
        likesCount: '',
        altDescription: '',
        tags: [],
        prevDateUrl: '/2025-06-27',
        nextDateUrl: '/2025-06-29',
        showNextArrow: true,
      };

      const result = renderProcessingPage(mockData);

      const htmlString = toHtml(result);

      // Check that auto-refresh JavaScript is included
      expect(htmlString).toContain('setTimeout(function () {');
      expect(htmlString).toContain('window.location.href = url.toString()');
      expect(htmlString).toContain('2000'); // 2 second delay
      expect(htmlString).toContain('attempt'); // URL parameter handling
      expect(htmlString).toContain('currentAttempt < 10'); // Max 10 attempts
    });

    it('should include loading animation elements', () => {
      const mockData = {
        ...pageBase,
        linkUrl: '',
        imageUrl: '',
        userProfileImage: '',
        userName: '',
        userUsername: '',
        userProfileUrl: '',
        likesCount: '',
        altDescription: '',
        tags: [],
        prevDateUrl: '/2025-06-27',
        nextDateUrl: '/2025-06-29',
        showNextArrow: true,
      };

      const result = renderProcessingPage(mockData);

      const htmlString = toHtml(result);

      // Check that loading elements are included
      expect(htmlString).toContain('loading-container');
      expect(htmlString).toContain('loading-spinner');
      expect(htmlString).toContain('spinner');
      expect(htmlString).toContain('loading-text');
      expect(htmlString).toContain('Processing your request...');
    });

    it('should include fallback message for max attempts exceeded', () => {
      const mockData = {
        ...pageBase,
        linkUrl: '',
        imageUrl: '',
        userProfileImage: '',
        userName: '',
        userUsername: '',
        userProfileUrl: '',
        likesCount: '',
        altDescription: '',
        tags: [],
        prevDateUrl: '/2025-06-27',
        nextDateUrl: '/2025-06-29',
        showNextArrow: true,
      };

      const result = renderProcessingPage(mockData);

      const htmlString = toHtml(result);

      // Check that fallback message is included
      expect(htmlString).toContain('Processing is taking longer than expected');
      expect(htmlString).toContain('manually refresh this page');
    });

    it('should link the shared stylesheet instead of inlining CSS', () => {
      const mockData = {
        ...pageBase,
        linkUrl: '',
        imageUrl: '',
        userProfileImage: '',
        userName: '',
        userUsername: '',
        userProfileUrl: '',
        likesCount: '',
        altDescription: '',
        tags: [],
        prevDateUrl: '/2025-06-27',
        nextDateUrl: '/2025-06-29',
        showNextArrow: true,
      };

      const htmlString = toHtml(renderProcessingPage(mockData));

      expect(htmlString).toContain('<link rel="stylesheet" href="/styles.css"');
      expect(htmlString).not.toContain('<style');
    });
  });

  describe('renderPhotoPage', () => {
    const mockData = {
      ...pageBase,
      linkUrl: 'https://unsplash.com/photos/test',
      imageUrl: 'https://images.unsplash.com/test.jpg',
      userProfileImage: 'https://images.unsplash.com/profile.jpg',
      userName: 'Test User',
      userUsername: 'testuser',
      userProfileUrl: 'https://unsplash.com/@testuser',
      likesCount: '123',
      altDescription: 'A cute cat',
      tags: [
        { type: 'search', title: 'cat' },
        { type: 'search', title: 'cute' },
      ],
      prevDateUrl: '/2025-06-27',
      nextDateUrl: '/2025-06-29',
      showNextArrow: true,
    };

    it('should render notification button in header', () => {
      const result = renderPhotoPage(mockData);

      const htmlString = toHtml(result);

      // Check that notification button is included
      expect(htmlString).toContain('id="notifications-button"');
      expect(htmlString).toContain(
        'class="icon-button notifications-button hidden"'
      );
      expect(htmlString).toContain('title="Toggle notifications"');
      expect(htmlString).toContain('type="button"');
    });

    it('should render both notification on and off icons', () => {
      const result = renderPhotoPage(mockData);

      const htmlString = toHtml(result);

      // Check that both notification icons are included
      expect(htmlString).toContain('class="notifications-on hidden"');
      expect(htmlString).toContain('class="notifications-off"');
      expect(htmlString).toContain('viewBox="0 -960 960 960"'); // SVG viewBox from notification icons
    });

    it('should render header controls container with notification and share buttons', () => {
      const result = renderPhotoPage(mockData);

      const htmlString = toHtml(result);

      // Check that header controls container is included
      expect(htmlString).toContain('class="header-controls"');
      expect(htmlString).toContain('id="notifications-button"');
      expect(htmlString).toContain('id="share-button"');
    });

    it('should include notification toggle JavaScript functionality', () => {
      const result = renderPhotoPage(mockData);

      const htmlString = toHtml(result);

      // Since notification functionality is now handled by external notifications.ts module,
      // we just check that the button elements are present for the module to interact with
      expect(htmlString).toContain('id="notifications-button"');
      expect(htmlString).toContain('class="notifications-on hidden"');
      expect(htmlString).toContain('class="notifications-off"');
    });

    it('should link the shared stylesheet once, in the head, instead of inlining CSS', () => {
      const htmlString = toHtml(renderPhotoPage(mockData));
      const head = htmlString.slice(0, htmlString.indexOf('</head>'));

      expect(head).toContain('<link rel="stylesheet" href="/styles.css"');
      expect(htmlString.split('href="/styles.css"')).toHaveLength(2);
      expect(htmlString).not.toContain('<style');
    });

    it('should render the elements the client scripts style by class', () => {
      const htmlString = toHtml(renderPhotoPage(mockData));

      expect(htmlString).toContain('id="toast" class="toast"');
      expect(htmlString).toContain('class="icon-button share-button hidden"');
      expect(htmlString).toContain('class="notifications-on hidden"');
      expect(htmlString).toContain('class="notifications-off"');
    });

    it('should render one page wrapper with no inline styles', () => {
      const htmlString = toHtml(renderPhotoPage(mockData));

      expect(htmlString).toContain('<div class="page">');
      expect(htmlString).not.toContain('left-column');
      expect(htmlString).not.toContain('style=');
      expect(htmlString).toMatch(/class="cat-image"[^>]*draggable="false"/);
    });

    it('should start with the doctype and contain no Lit hydration markers', () => {
      const htmlString = toHtml(renderPhotoPage(mockData));

      expect(htmlString.trimStart()).toMatch(/^<!doctype html>/);
      expect(htmlString).not.toMatch(/<!--\/?lit-|<!--\?-->/);
    });

    it('should position notification button between title and share button', () => {
      const result = renderPhotoPage(mockData);

      const htmlString = toHtml(result);

      // Check the order of elements in the header
      const titleIndex = htmlString.indexOf('class="header-title"');
      const notificationIndex = htmlString.indexOf('id="notifications-button"');
      const shareIndex = htmlString.indexOf('id="share-button"');

      expect(titleIndex).toBeLessThan(notificationIndex);
      expect(notificationIndex).toBeLessThan(shareIndex);
    });

    it('should render the previous arrow only when it is shown', () => {
      expect(toHtml(renderPhotoPage(mockData))).toMatch(
        /href="\/2025-06-27"\s+class="icon-button nav-arrow left"/
      );

      const onMinDate = toHtml(
        renderPhotoPage({ ...mockData, showPrevArrow: false })
      );
      expect(onMinDate).not.toContain('nav-arrow left');
      expect(onMinDate).toContain('nav-arrow right');
    });

    it('should render per-day title and link-preview tags with absolute URLs', () => {
      const htmlString = toHtml(renderPhotoPage(mockData));

      expect(htmlString).toContain('<title>Daily Cat: June 28, 2025</title>');
      expect(htmlString).toContain(
        '<meta property="og:title" content="Daily Cat: June 28, 2025"'
      );
      expect(htmlString).toContain(
        '<link rel="canonical" href="https://daily.cat/2025-06-28"'
      );
      expect(htmlString).toContain(
        '<meta property="og:url" content="https://daily.cat/2025-06-28"'
      );
      expect(htmlString).toContain(
        '<meta property="og:image" content="https://images.unsplash.com/test.jpg"'
      );
      expect(htmlString).toContain(
        '<meta name="twitter:image" content="https://images.unsplash.com/test.jpg"'
      );
      expect(htmlString).toContain(
        '<meta property="og:description" content="A cute cat. Photo by Test User on Unsplash."'
      );
      expect(htmlString).not.toContain('content="/images/cat.png"');
    });

    it('should escape photo text in meta tags', () => {
      const htmlString = toHtml(
        renderPhotoPage({
          ...mockData,
          meta: {
            ...mockData.meta,
            description: 'A "cat" <script>alert(1)</script>',
          },
        })
      );

      expect(htmlString).not.toContain('<script>alert(1)</script>');
      expect(htmlString).toContain('&quot;cat&quot;');
    });

    it('should escape the title', () => {
      const htmlString = toHtml(
        renderPhotoPage({
          ...mockData,
          meta: { ...mockData.meta, title: 'A </title><b>x</b> & B' },
        })
      );

      expect(htmlString).toContain(
        '<title>A &lt;/title&gt;&lt;b&gt;x&lt;/b&gt; &amp; B</title>'
      );
    });
  });
});
