import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a decimal string that may use comma or period as decimal separator.
 * Returns NaN if the string is not a valid number.
 */
export function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'));
}
