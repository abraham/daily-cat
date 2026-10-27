import { describe, expect, it } from 'vitest';
import { addDays, toDateString } from './dates';

describe('toDateString', () => {
  it('uses the UTC day', () => {
    expect(toDateString(new Date('2026-10-27T23:59:59.999Z'))).toBe(
      '2026-10-27'
    );
    expect(toDateString(new Date('2026-10-28T00:00:00.000Z'))).toBe(
      '2026-10-28'
    );
  });
});

describe('addDays', () => {
  it('moves forward and back across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-10-27', 29)).toBe('2026-11-25');
    expect(addDays('2026-10-27', 0)).toBe('2026-10-27');
  });
});
