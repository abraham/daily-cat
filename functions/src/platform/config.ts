export interface Config {
  minDate: string; // ISO date string (YYYY-MM-DD)
  importEnabled: boolean; // Whether to enable import functionality
  lastPage: string; // Last page processed for import
  importLimit: number; // Limit for import operations
  processLimit: number; // Limit for processing operations
  processingMinDate: string; // Minimum date for processing operations
}

interface FieldRule {
  expected: string;
  isValid: (value: unknown) => boolean;
}

function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// Keyed by Config, so adding a field without a rule is a type error.
const configSchema: Record<keyof Config, FieldRule> = {
  minDate: { expected: 'a YYYY-MM-DD date', isValid: isCalendarDate },
  importEnabled: {
    expected: 'a boolean',
    isValid: (value) => typeof value === 'boolean',
  },
  lastPage: {
    expected: 'a positive integer string, such as "1"',
    isValid: (value) => typeof value === 'string' && /^[1-9]\d*$/.test(value),
  },
  importLimit: {
    expected: 'a non-negative integer',
    isValid: isNonNegativeInteger,
  },
  processLimit: {
    expected: 'a non-negative integer',
    isValid: isNonNegativeInteger,
  },
  processingMinDate: { expected: 'a YYYY-MM-DD date', isValid: isCalendarDate },
};

/**
 * Check the stored config/config document against the schema
 * @param data - The document's data, as returned by Firestore
 * @returns Config - The validated configuration
 * @throws Error listing every field that is missing or has the wrong type
 */
export function parseConfig(data: unknown): Config {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid config/config: the document has no data');
  }

  const fields = data as Record<string, unknown>;
  const problems = Object.entries(configSchema)
    .filter(([field, rule]) => !rule.isValid(fields[field]))
    .map(
      ([field, rule]) =>
        `${field} must be ${rule.expected}, got ${JSON.stringify(fields[field]) ?? 'nothing'}`
    );

  if (problems.length > 0) {
    throw new Error(`Invalid config/config: ${problems.join('; ')}`);
  }

  return fields as unknown as Config;
}
