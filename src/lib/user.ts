export function getRequestUserId(headerValue: string | null): string {
  // Auth.js integration will replace this fallback identifier.
  return headerValue?.trim() || "demo-user";
}
