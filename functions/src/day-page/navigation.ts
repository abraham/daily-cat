/**
 * Navigation utilities for date-based navigation
 */

export interface NavigationUrls {
  prevDateUrl: string;
  showPrevArrow: boolean;
  nextDateUrl: string;
  showNextArrow: boolean;
}

/**
 * Calculate navigation URLs for date-based navigation
 * @param requestedDate - The currently requested date (YYYY-MM-DD format)
 * @param minDate - The earliest date that is served (YYYY-MM-DD format)
 * @returns Navigation URLs and classes for previous/next navigation
 */
export function calculateNavigationUrls(
  requestedDate: string,
  minDate: string
): NavigationUrls {
  const requestedDateObj = new Date(requestedDate + 'T00:00:00.000Z');
  const currentDateObj = new Date();
  const currentDateString = currentDateObj.toISOString().split('T')[0];

  // Previous date (only if requested date is after minDate)
  let prevDateUrl = '#';
  let showPrevArrow = false;
  if (requestedDate > minDate) {
    const prevDateObj = new Date(requestedDateObj);
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    prevDateUrl = `/${prevDateObj.toISOString().split('T')[0]}`;
    showPrevArrow = true;
  }

  // Next date (only if requested date is before today)
  let nextDateUrl = '#';
  let showNextArrow = false;
  if (requestedDate < currentDateString) {
    const nextDateObj = new Date(requestedDateObj);
    nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);
    const nextDateString = nextDateObj.toISOString().split('T')[0];
    nextDateUrl = `/${nextDateString}`;
    showNextArrow = true;
  }

  return {
    prevDateUrl,
    showPrevArrow,
    nextDateUrl,
    showNextArrow,
  };
}
