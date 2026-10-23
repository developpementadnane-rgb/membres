// Decouples the API layer (plain functions) from AuthContext (React state)
// so a confirmed 401 (real JWT expiry, not a network failure) can flip the
// UI into "please log in again" without every fetch call needing direct
// access to the auth context.

export const AUTH_EXPIRED_EVENT = "shm:auth-expired";

export function emitAuthExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

export function onAuthExpired(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
}

/** Thrown by authenticatedFetch when the server confirms the token is invalid/expired
 * (as opposed to a network error, which throws a plain TypeError from fetch itself). */
export class AuthExpiredError extends Error {
  constructor() {
    super("Session expired on the server.");
    this.name = "AuthExpiredError";
  }
}
