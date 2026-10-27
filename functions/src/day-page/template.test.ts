import { describe, it, expect } from 'vitest';
import { render } from '@lit-labs/ssr';
import { renderProcessingPage, renderPhotoPage } from './template';

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
  let htmlString = '';
  for (const chunk of render(result)) {
    htmlString += chunk;
  }
  return htmlString;
}

describe('Template', () => {
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

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

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

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

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

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that fallback message is included
      expect(htmlString).toContain('Processing is taking longer than expected');
      expect(htmlString).toContain('manually refresh this page');
    });

    it('should include CSS styles for loading animation', () => {
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

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that CSS styles are included
      expect(htmlString).toContain('@keyframes spin');
      expect(htmlString).toContain('animation: spin 1s linear infinite');
      expect(htmlString).toContain('border-radius: 50%');
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

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that notification button is included
      expect(htmlString).toContain('id="notifications-button"');
      expect(htmlString).toContain('class="notifications-button hidden"');
      expect(htmlString).toContain('title="Toggle notifications"');
      expect(htmlString).toContain('type="button"');
    });

    it('should render both notification on and off icons', () => {
      const result = renderPhotoPage(mockData);

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that both notification icons are included
      expect(htmlString).toContain('class="notifications-on hidden"');
      expect(htmlString).toContain('class="notifications-off"');
      expect(htmlString).toContain('viewBox="0 -960 960 960"'); // SVG viewBox from notification icons
    });

    it('should render header controls container with notification and share buttons', () => {
      const result = renderPhotoPage(mockData);

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that header controls container is included
      expect(htmlString).toContain('class="header-controls"');
      expect(htmlString).toContain('id="notifications-button"');
      expect(htmlString).toContain('id="share-button"');
    });

    it('should include notification toggle JavaScript functionality', () => {
      const result = renderPhotoPage(mockData);

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Since notification functionality is now handled by external notifications.ts module,
      // we just check that the button elements are present for the module to interact with
      expect(htmlString).toContain('id="notifications-button"');
      expect(htmlString).toContain('class="notifications-on hidden"');
      expect(htmlString).toContain('class="notifications-off"');
    });

    it('should include CSS styles for notification button', () => {
      const result = renderPhotoPage(mockData);

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that notification button styles are included
      expect(htmlString).toContain('.notifications-button {');
      expect(htmlString).toContain('.header-controls {');
      expect(htmlString).toContain('.notifications-button:hover {');
      expect(htmlString).toContain('.notifications-button:active {');
      expect(htmlString).toContain('.notifications-on,');
      expect(htmlString).toContain('.notifications-off {');
    });

    it('should include mobile responsive styles for notification button', () => {
      const result = renderPhotoPage(mockData);

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that mobile styles for notification button are included
      expect(htmlString).toContain('.notifications-button {');
      expect(htmlString).toMatch(/width:\s*48px/); // Mobile button size
      expect(htmlString).toMatch(/height:\s*48px/); // Mobile button size
    });

    it('should include safe area styles for notification button on mobile', () => {
      const result = renderPhotoPage(mockData);

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check that safe area styles are included
      expect(htmlString).toContain('env(safe-area-inset-right)');
      expect(htmlString).toContain('.header-controls {');
    });

    it('should position notification button between title and share button', () => {
      const result = renderPhotoPage(mockData);

      // Convert lit-html template result to string
      const htmlIterator = render(result);
      let htmlString = '';
      for (const chunk of htmlIterator) {
        htmlString += chunk;
      }

      // Check the order of elements in the header
      const titleIndex = htmlString.indexOf('class="header-title"');
      const notificationIndex = htmlString.indexOf('id="notifications-button"');
      const shareIndex = htmlString.indexOf('id="share-button"');

      expect(titleIndex).toBeLessThan(notificationIndex);
      expect(notificationIndex).toBeLessThan(shareIndex);
    });

    it('should render the previous arrow only when it is shown', () => {
      expect(toHtml(renderPhotoPage(mockData))).toContain(
        'href="/2025-06-27" class="nav-arrow left"'
      );

      const onMinDate = toHtml(
        renderPhotoPage({ ...mockData, showPrevArrow: false })
      );
      expect(onMinDate).not.toContain('nav-arrow left');
      expect(onMinDate).toContain('nav-arrow right');
    });

    it('should render per-day title and link-preview tags with absolute URLs', () => {
      const htmlString = toHtml(renderPhotoPage(mockData));

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
  });
});
