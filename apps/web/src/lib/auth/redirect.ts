/**
 * Only allow same-site relative paths as post-login destinations (prevents open redirects).
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
