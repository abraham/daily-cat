import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateNavigationUrls } from './navigation';

const MIN_DATE = '2024-01-01';

describe('Navigation Utils', () => {
  describe('calculateNavigationUrls', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate correct navigation URLs for a past date', () => {
      // Mock current date to be 2025-06-27
      vi.setSystemTime(new Date('2025-06-27T12:00:00.000Z'));

      const result = calculateNavigationUrls('2025-06-25', MIN_DATE);

      expect(result.prevDateUrl).toBe('/2025-06-24'); // one day before 2025-06-25
      expect(result.showPrevArrow).toBe(true);
      expect(result.nextDateUrl).toBe('/2025-06-26'); // one day after 2025-06-25
      expect(result.showNextArrow).toBe(true);
    });

    it('should hide next arrow for today', () => {
      // Mock current date to be 2025-06-27
      vi.setSystemTime(new Date('2025-06-27T12:00:00.000Z'));

      const result = calculateNavigationUrls('2025-06-27', MIN_DATE);

      expect(result.prevDateUrl).toBe('/2025-06-26'); // one day before 2025-06-27
      expect(result.nextDateUrl).toBe('#');
      expect(result.showNextArrow).toBe(false);
    });

    it('should calculate correct navigation URLs for yesterday', () => {
      // Mock current date to be 2025-06-27
      vi.setSystemTime(new Date('2025-06-27T12:00:00.000Z'));

      const result = calculateNavigationUrls('2025-06-26', MIN_DATE);

      expect(result.prevDateUrl).toBe('/2025-06-25'); // one day before 2025-06-26
      expect(result.nextDateUrl).toBe('/2025-06-27'); // one day after 2025-06-26
      expect(result.showNextArrow).toBe(true);
    });

    it('should handle month boundaries correctly', () => {
      // Mock current date to be 2025-07-01
      vi.setSystemTime(new Date('2025-07-01T12:00:00.000Z'));

      const result = calculateNavigationUrls('2025-06-30', MIN_DATE);

      expect(result.prevDateUrl).toBe('/2025-06-29'); // one day before 2025-06-30
      expect(result.nextDateUrl).toBe('/2025-07-01'); // one day after 2025-06-30
      expect(result.showNextArrow).toBe(true);
    });

    it('should handle year boundaries correctly', () => {
      // Mock current date to be 2026-01-01
      vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

      const result = calculateNavigationUrls('2025-12-31', MIN_DATE);

      expect(result.prevDateUrl).toBe('/2025-12-30'); // one day before 2025-12-31
      expect(result.nextDateUrl).toBe('/2026-01-01'); // one day after 2025-12-31
      expect(result.showNextArrow).toBe(true);
    });

    it('should handle leap year dates correctly', () => {
      // Mock current date to be 2024-03-01
      vi.setSystemTime(new Date('2024-03-01T12:00:00.000Z'));

      const result = calculateNavigationUrls('2024-02-29', MIN_DATE);

      expect(result.prevDateUrl).toBe('/2024-02-28'); // one day before 2024-02-29
      expect(result.nextDateUrl).toBe('/2024-03-01'); // one day after 2024-02-29
      expect(result.showNextArrow).toBe(true);
    });

    it('should hide the previous arrow on minDate', () => {
      vi.setSystemTime(new Date('2025-06-27T12:00:00.000Z'));

      const result = calculateNavigationUrls('2025-06-01', '2025-06-01');

      expect(result.prevDateUrl).toBe('#');
      expect(result.showPrevArrow).toBe(false);
      expect(result.nextDateUrl).toBe('/2025-06-02');
    });

    it('should show the previous arrow the day after minDate', () => {
      vi.setSystemTime(new Date('2025-06-27T12:00:00.000Z'));

      const result = calculateNavigationUrls('2025-06-02', '2025-06-01');

      expect(result.prevDateUrl).toBe('/2025-06-01');
      expect(result.showPrevArrow).toBe(true);
    });
  });
});
