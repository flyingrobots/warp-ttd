/**
 * Shared validation utilities for app-layer domain objects.
 */

export function requireNonEmpty(value: string, field: string): string {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }

  return value;
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
