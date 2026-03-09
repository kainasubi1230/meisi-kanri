export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getAllowedEmails(): string[] {
  const raw = process.env.APP_ALLOWED_EMAILS || process.env.APP_LOGIN_EMAIL || "";
  return raw
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter((email) => email.length > 0);
}

export function isEmailAllowed(email: string): boolean {
  const allowedEmails = getAllowedEmails();
  if (allowedEmails.length === 0) {
    return true;
  }

  return allowedEmails.includes(normalizeEmail(email));
}
