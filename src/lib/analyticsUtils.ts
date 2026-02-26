/**
 * Safely computes percentage change between two revenue values.
 * Returns 0 for 0/0, 100 for positive/0 (new revenue), and normal % for all other cases.
 * Result is always a finite number.
 */
export function safeRevenueChange(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}
