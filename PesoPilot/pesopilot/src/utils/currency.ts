/**
 * Format a number as Philippine Peso currency
 */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a peso formatted string back to a number
 */
export function parsePeso(value: string): number {
  // Remove currency symbol, commas, and spaces
  const cleanValue = value.replace(/[₱,\s]/g, "");
  return parseFloat(cleanValue) || 0;
}

/**
 * Format number with commas (no currency symbol)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-PH").format(num);
}
