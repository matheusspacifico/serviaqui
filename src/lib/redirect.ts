export const DEFAULT_REDIRECT = "/dashboard";

export function safeRedirectPath(
  value: string | string[] | undefined,
): string {
  if (typeof value !== "string") return DEFAULT_REDIRECT;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_REDIRECT;
  if (/[\\\u0000-\u001f]/.test(value)) return DEFAULT_REDIRECT;
  return value;
}

export function withRedirect(path: string, redirectTo: string): string {
  if (redirectTo === DEFAULT_REDIRECT) return path;
  return `${path}?redirectTo=${encodeURIComponent(redirectTo)}`;
}
