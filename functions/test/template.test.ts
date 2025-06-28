import { describe, it, expect } from 'vitest';
import { render } from '@lit-labs/ssr';
import { renderProcessingPage } from '../src/template';

describe('Template', () => {
  describe('renderProcessingPage', () => {
    it('should include auto-refresh JavaScript for processing page', () => {
      const mockData = {
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
});
