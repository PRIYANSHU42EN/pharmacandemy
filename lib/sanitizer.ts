export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Sanitizes a username string.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes characters not matching USERNAME_REGEX
 * Returns the sanitized string.
 */
export function sanitizeUsername(input: string): string {
  const trimmed = input.trim().toLowerCase();
  // Keep only allowed characters
  const cleaned = trimmed.replace(/[^a-zA-Z0-9_]/g, "");
  return cleaned;
}
