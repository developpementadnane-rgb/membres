import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { User } from "@/context/AuthContext";

const SESSION_KEY = "shm_member_session_v1";

export interface StoredSession {
  user: User;
  loginAt: string;
}

const isNative = Capacitor.isNativePlatform();

// On native Android/iOS, the WebView's localStorage is not reliably kept
// after the OS kills the app process (swiping it away from recents can
// wipe it in well under 5s on some devices). @capacitor/preferences writes
// to native persistent storage (SharedPreferences on Android, UserDefaults
// on iOS) instead, which is what apps like WhatsApp/Instagram rely on to
// stay logged in across restarts. Keep localStorage for the web build,
// where it already works fine and Preferences isn't needed.
async function storageGet(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }
  return localStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

async function storageRemove(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}

export function buildSession(user: User): StoredSession {
  return { user, loginAt: new Date().toISOString() };
}

export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await storageSet(SESSION_KEY, JSON.stringify(session));
    if (session.user.token) await storageSet("authToken", session.user.token);
    await storageSet("user_generated_id", session.user.generated_id);
  } catch (error) {
    console.error("[offline/session] Failed to persist session:", error);
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await storageGet(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.user) return null;
    return { user: parsed.user, loginAt: parsed.loginAt || new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await storageRemove(SESSION_KEY);
  await storageRemove("authToken");
  await storageRemove("authUser");
  await storageRemove("user_generated_id");
}

/**
 * The one and only way anything should read the auth token. Added
 * because api.ts used to read `localStorage.getItem("authToken")`
 * directly, which is wrong on native: the token is written here via
 * `storageSet`, which on native goes to @capacitor/preferences, NOT
 * localStorage. That mismatch meant the token was never actually
 * found on native after an app restart -- the session LOOKED restored
 * (loadSession() found the user fine) but every real API call went
 * out with no Authorization header, got a 401, and the session was
 * wiped again immediately. This is almost certainly why "connexion
 * persistante" looked broken on the native app specifically.
 */
export async function getStoredToken(): Promise<string | null> {
  return storageGet("authToken");
}

export function touchSession(): void {}

export type SessionValidity =
  | { status: "valid" }
  | { status: "none" };

export function evaluateSession(session: StoredSession | null): SessionValidity {
  return session ? { status: "valid" } : { status: "none" };
}
