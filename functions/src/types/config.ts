export interface Config {
  minDate: string; // ISO date string (YYYY-MM-DD)
  importEnabled: boolean; // Whether to enable import functionality
  lastPage: string; // Last page processed for import
  importLimit: number; // Limit for import operations
  processLimit: number; // Limit for processing operations
  processingMinDate: string; // Minimum date for processing operations
}
