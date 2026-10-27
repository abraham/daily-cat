/**
 * Navigation utilities for date-based navigation
 */

import { addDays, toDateString } from '../platform';

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
  const today = toDateString(new Date());
  const showPrevArrow = requestedDate > minDate;
  const showNextArrow = requestedDate < today;

  return {
    prevDateUrl: showPrevArrow ? `/${addDays(requestedDate, -1)}` : '#',
    showPrevArrow,
    nextDateUrl: showNextArrow ? `/${addDays(requestedDate, 1)}` : '#',
    showNextArrow,
  };
}
