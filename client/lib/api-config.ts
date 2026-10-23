/**
 * API base URL resolution.
 *
 * On the web (Netlify), relative "/api/*" calls work fine because the SPA and
 * the Netlify Functions live on the same origin.
 *
 * Inside the packaged Android APK (Capacitor), there is no local backend:
 * the app is loaded from a bundled `file://`/`capacitor://` origin, so a
 * relative "/api/*" call resolves to nothing and silently fails. In that
 * case every API call must be prefixed with the full URL of the deployed
 * Netlify site.
 *
 * Set VITE_API_BASE_URL at build time (see .env / GitHub Actions secrets)
 * to the deployed site, e.g. https://rapports-alamal.netlify.app
 * Leave it empty for normal web builds.
 */
import { Capacitor } from "@capacitor/core";

function resolveApiBaseUrl(): string {
  const productionBaseUrl = "https://mon-shm.netlify.app";
  const configured = (import.meta.env.VITE_API_BASE_URL || productionBaseUrl).trim().replace(/\/+$/, "");

  if (Capacitor.isNativePlatform()) {
    if (!configured) {
      // Fail loudly during development so a missing env var is obvious
      // instead of every request silently 404-ing inside the APK.
      console.error(
        "[api-config] Running inside the native app but VITE_API_BASE_URL is not set. " +
          "All /api/* calls will fail. Set VITE_API_BASE_URL to the deployed Netlify URL.",
      );
    }
    return configured;
  }

  // Web preview and production: use the same origin the app is being
  // served from, so every Netlify/Builder deployment (mon-shm,
  // app-membre, previews, etc.) talks to its own API instead of always
  // hitting the hardcoded productionBaseUrl.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return productionBaseUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Builds a full request URL for a given "/api/..." path. */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export const isNativeApp = Capacitor.isNativePlatform();
