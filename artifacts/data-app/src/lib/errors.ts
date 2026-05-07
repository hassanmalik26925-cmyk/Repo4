/**
 * Converts raw HTTP/ApiError messages into simple, human-readable English.
 * Used across login, registration, and integration forms.
 */
export function friendlyError(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";

  const raw = err instanceof Error ? err.message : String(err);

  // ── Auth errors ───────────────────────────────────────────────────────────
  if (raw.includes("409") || raw.toLowerCase().includes("already in use") ||
      raw.toLowerCase().includes("conflict")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (raw.includes("401") || raw.toLowerCase().includes("invalid credentials") ||
      raw.toLowerCase().includes("unauthorized")) {
    return "Wrong email or password. Please check and try again.";
  }
  if (raw.includes("403") || raw.toLowerCase().includes("forbidden")) {
    return "You don't have permission to do this.";
  }

  // ── Integration / request errors ──────────────────────────────────────────
  if (raw.includes("400") || raw.toLowerCase().includes("bad request")) {
    if (raw.toLowerCase().includes("url") || raw.toLowerCase().includes("credentials") ||
        raw.toLowerCase().includes("domain")) {
      return "Invalid store credentials. Check that your shop domain is correct (e.g. mystore.myshopify.com, without https://).";
    }
    if (raw.toLowerCase().includes("token")) {
      return "Invalid access token. Please check your API credentials and try again.";
    }
    return "The information you entered is not valid. Please check it and try again.";
  }
  if (raw.includes("404") || raw.toLowerCase().includes("not found")) {
    return "Store not found. Double-check your shop domain or account ID.";
  }
  if (raw.includes("422") || raw.toLowerCase().includes("unprocessable")) {
    return "The information you entered is not valid. Please check it and try again.";
  }
  if (raw.includes("429") || raw.toLowerCase().includes("too many")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (raw.includes("5") && (raw.includes("500") || raw.includes("502") ||
      raw.includes("503") || raw.toLowerCase().includes("server error"))) {
    return "The server is temporarily unavailable. Please try again in a moment.";
  }

  // ── Network errors ────────────────────────────────────────────────────────
  if (raw.toLowerCase().includes("failed to fetch") ||
      raw.toLowerCase().includes("network") ||
      raw.toLowerCase().includes("offline")) {
    return "Network error. Check your internet connection and try again.";
  }

  // ── If already a clean message (no HTTP prefix), pass it through ──────────
  if (!raw.startsWith("HTTP")) return raw;

  // ── Generic fallback ──────────────────────────────────────────────────────
  return "Something went wrong. Please try again.";
}
