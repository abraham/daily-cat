import { describe, it, expect } from 'vitest';
import { parseConfig } from './config';

const validConfig = {
  minDate: '2025-01-01',
  importEnabled: true,
  lastPage: '12',
  importLimit: 10,
  processLimit: 5,
  processingMinDate: '2025-01-01',
};

describe('parseConfig', () => {
  it('returns a valid config unchanged', () => {
    expect(parseConfig(validConfig)).toEqual(validConfig);
  });

  it('allows fields the schema does not know about', () => {
    const withExtra = { ...validConfig, note: 'kept' };

    expect(parseConfig(withExtra)).toEqual(withExtra);
  });

  it('accepts zero limits and a disabled import', () => {
    const config = {
      ...validConfig,
      importEnabled: false,
      importLimit: 0,
      processLimit: 0,
    };

    expect(parseConfig(config)).toEqual(config);
  });

  it('rejects a document with no data', () => {
    expect(() => parseConfig(undefined)).toThrow(
      'Invalid config/config: the document has no data'
    );
  });

  it('names a missing field', () => {
    const { processingMinDate: _omitted, ...missing } = validConfig;

    expect(() => parseConfig(missing)).toThrow(
      'Invalid config/config: processingMinDate must be a YYYY-MM-DD date, got nothing'
    );
  });

  it.each([
    ['minDate', '2025-02-30', 'a YYYY-MM-DD date'],
    ['minDate', '2025/01/01', 'a YYYY-MM-DD date'],
    ['importEnabled', 'true', 'a boolean'],
    ['lastPage', 5, 'a positive integer string, such as "1"'],
    ['lastPage', '0', 'a positive integer string, such as "1"'],
    ['lastPage', 'NaN', 'a positive integer string, such as "1"'],
    ['importLimit', '10', 'a non-negative integer'],
    ['importLimit', 1.5, 'a non-negative integer'],
    ['processLimit', -1, 'a non-negative integer'],
    ['processingMinDate', null, 'a YYYY-MM-DD date'],
  ])('rejects %s = %j', (field, value, expected) => {
    expect(() => parseConfig({ ...validConfig, [field]: value })).toThrow(
      `${field} must be ${expected}, got ${JSON.stringify(value)}`
    );
  });

  it('lists every problem in one error', () => {
    const { minDate: _omitted, ...rest } = validConfig;
    const config = { ...rest, minDay: '2025-01-01', importLimit: '1' };

    expect(() => parseConfig(config)).toThrow(
      'Invalid config/config: minDate must be a YYYY-MM-DD date, got nothing; importLimit must be a non-negative integer, got "1"'
    );
  });
});
