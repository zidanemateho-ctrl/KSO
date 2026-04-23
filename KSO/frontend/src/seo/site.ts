const FALLBACK_SITE_URL = "https://kso-frontend.onrender.com";

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return FALLBACK_SITE_URL;
  }

  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_NAME = "KSO";
export const SITE_URL = normalizeBaseUrl(import.meta.env.VITE_SITE_URL ?? FALLBACK_SITE_URL);
export const DEFAULT_OG_IMAGE = `${SITE_URL}/kso-logo.jpeg`;

export function absoluteUrl(path: string) {
  if (!path || path === "/") {
    return SITE_URL;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
