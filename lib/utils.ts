/**
 * Normalizes a username by trimming whitespace and converting to lowercase
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Normalizes an email by trimming whitespace and converting to lowercase
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

