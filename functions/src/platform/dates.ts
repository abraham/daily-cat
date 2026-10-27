/** The `YYYY-MM-DD` of the UTC day that contains `date`. */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** The `YYYY-MM-DD` that is `days` days after the `YYYY-MM-DD` `date`. */
export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return toDateString(result);
}
