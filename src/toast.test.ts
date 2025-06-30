import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showToast } from './toast';

// Mock console.error
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Toast', () => {
  let mockToastElement: HTMLElement;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Create mock toast element
    mockToastElement = document.createElement('div');
    mockToastElement.id = 'toast';
    mockToastElement.className = 'toast';
    document.body.appendChild(mockToastElement);

    // Mock setTimeout to execute immediately for testing
    vi.useFakeTimers();

    // Clear console spy calls
    consoleSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('showToast', () => {
    it('should show toast with default parameters', () => {
      showToast('Test message');

      expect(mockToastElement.textContent).toBe('Test message');
      expect(mockToastElement.className).toBe('toast info');
    });

    it('should show toast with custom type', () => {
      showToast('Success message', 'success');

      expect(mockToastElement.textContent).toBe('Success message');
      expect(mockToastElement.className).toBe('toast success');
    });

    it('should show toast with custom type and duration', () => {
      showToast('Custom message', 'error', 5000);

      expect(mockToastElement.textContent).toBe('Custom message');
      expect(mockToastElement.className).toBe('toast error');
    });

    it('should use default type when type is empty string', () => {
      showToast('Test message', '');

      expect(mockToastElement.className).toBe('toast info');
    });

    it('should use default type when type is undefined', () => {
      showToast('Test message', undefined);

      expect(mockToastElement.className).toBe('toast info');
    });

    it('should use default duration when duration is 0', () => {
      showToast('Test message', 'info', 0);

      // Fast-forward time to check that default duration (3000ms) is used
      vi.advanceTimersByTime(10);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Should still be showing after 2999ms
      vi.advanceTimersByTime(2989);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Should be hidden after 3000ms total
      vi.advanceTimersByTime(1);
      expect(mockToastElement.classList.contains('show')).toBe(false);
    });

    it('should add show class after 10ms delay', () => {
      showToast('Test message');

      // Initially should not have 'show' class
      expect(mockToastElement.classList.contains('show')).toBe(false);

      // After 10ms, should have 'show' class
      vi.advanceTimersByTime(10);
      expect(mockToastElement.classList.contains('show')).toBe(true);
    });

    it('should remove show class after specified duration', () => {
      const customDuration = 2000;
      showToast('Test message', 'info', customDuration);

      // Initially no show class
      expect(mockToastElement.classList.contains('show')).toBe(false);

      // Show the toast after 10ms
      vi.advanceTimersByTime(10);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Still showing just before the full duration expires
      vi.advanceTimersByTime(customDuration - 10 - 1);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Should be hidden after the full duration from start
      vi.advanceTimersByTime(1);
      expect(mockToastElement.classList.contains('show')).toBe(false);
    });

    it('should remove show class after default duration (3000ms)', () => {
      showToast('Test message');

      // Initially no show class
      expect(mockToastElement.classList.contains('show')).toBe(false);

      // Show the toast after 10ms
      vi.advanceTimersByTime(10);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Still showing just before the full default duration expires
      vi.advanceTimersByTime(3000 - 10 - 1);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Should be hidden after the full default duration from start
      vi.advanceTimersByTime(1);
      expect(mockToastElement.classList.contains('show')).toBe(false);
    });

    it('should handle when toast element does not exist', () => {
      // Remove toast element from DOM
      mockToastElement.remove();

      showToast('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('Toast element not found');
    });

    it('should handle null toast element', () => {
      // Mock getElementById to return null
      const originalGetElementById = document.getElementById;
      document.getElementById = vi.fn().mockReturnValue(null);

      showToast('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('Toast element not found');

      // Restore original method
      document.getElementById = originalGetElementById;
    });

    it('should update existing toast content when called multiple times', () => {
      showToast('First message', 'info');
      expect(mockToastElement.textContent).toBe('First message');
      expect(mockToastElement.className).toBe('toast info');

      showToast('Second message', 'success');
      expect(mockToastElement.textContent).toBe('Second message');
      expect(mockToastElement.className).toBe('toast success');
    });

    it('should handle different toast types correctly', () => {
      const testCases = [
        { type: 'info', expected: 'toast info' },
        { type: 'success', expected: 'toast success' },
        { type: 'error', expected: 'toast error' },
        { type: 'warning', expected: 'toast warning' },
        { type: 'custom-type', expected: 'toast custom-type' },
      ];

      testCases.forEach(({ type, expected }) => {
        showToast('Test message', type);
        expect(mockToastElement.className).toBe(expected);
      });
    });

    it('should handle empty message', () => {
      showToast('');
      expect(mockToastElement.textContent).toBe('');
      expect(mockToastElement.className).toBe('toast info');
    });

    it('should handle very long messages', () => {
      const longMessage = 'This is a very long message '.repeat(20);
      showToast(longMessage);
      expect(mockToastElement.textContent).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const specialMessage =
        'Message with <script>alert("xss")</script> & special chars!';
      showToast(specialMessage);
      expect(mockToastElement.textContent).toBe(specialMessage);
      // textContent should escape HTML, so it should be safe
      expect(mockToastElement.innerHTML).not.toContain('<script>');
    });

    it('should handle very short duration', () => {
      // Use a duration that's longer than the show delay (10ms) to avoid edge cases
      showToast('Test message', 'info', 20);

      // Initially no show class
      expect(mockToastElement.classList.contains('show')).toBe(false);

      // Show the toast after 10ms
      vi.advanceTimersByTime(10);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Still showing just before the duration expires
      vi.advanceTimersByTime(20 - 10 - 1);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Should be hidden after the full duration from start
      vi.advanceTimersByTime(1);
      expect(mockToastElement.classList.contains('show')).toBe(false);
    });

    it('should handle very long duration', () => {
      const longDuration = 60000; // 1 minute
      showToast('Test message', 'info', longDuration);

      // Show the toast
      vi.advanceTimersByTime(10);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Should still be showing after 59 seconds
      vi.advanceTimersByTime(59000);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Should be hidden after 1 minute
      vi.advanceTimersByTime(1000);
      expect(mockToastElement.classList.contains('show')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid consecutive calls', () => {
      showToast('Message 1', 'info');
      showToast('Message 2', 'success');
      showToast('Message 3', 'error');

      // Last message should win
      expect(mockToastElement.textContent).toBe('Message 3');
      expect(mockToastElement.className).toBe('toast error');
    });

    it('should handle toast element being removed during animation', () => {
      showToast('Test message');

      // Start the show animation
      vi.advanceTimersByTime(10);
      expect(mockToastElement.classList.contains('show')).toBe(true);

      // Remove toast element during display
      mockToastElement.remove();

      // Should not throw error when trying to hide
      expect(() => {
        vi.advanceTimersByTime(3000);
      }).not.toThrow();
    });
  });
});
