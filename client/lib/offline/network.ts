/**
 * Network status detection.
 *
 * `navigator.onLine` only tells us the device has a network interface up
 * (e.g. connected to camp WiFi with no actual internet), which is not
 * reliable enough to decide whether we can talk to Supabase/Netlify.
 *
 * We combine:
 *  1. Capacitor's native Network plugin (accurate on Android) when running
 *     inside the APK.
 *  2. Browser online/offline events as a baseline everywhere else.
 *  3. A lightweight periodic "is the API actually reachable" probe against
 *     /api/ping, so a WiFi-without-internet situation is correctly reported
 *     as offline instead of leaving the UI in limbo.
 *
 * This is intentionally separate from session validity: losing connectivity
 * must never, by itself, log the member out (see AuthContext).
 */
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { apiUrl } from "@/lib/api-config";

export type ConnectivityState = "online" | "offline" | "checking";

const PING_TIMEOUT_MS = 5000;
const PING_INTERVAL_MS = 30000;

let cachedNetworkPlugin: typeof import("@capacitor/network").Network | null = null;
async function getNetworkPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  if (cachedNetworkPlugin) return cachedNetworkPlugin;
  try {
    const mod = await import("@capacitor/network");
    cachedNetworkPlugin = mod.Network;
    return cachedNetworkPlugin;
  } catch {
    return null;
  }
}

async function probeApiReachable(): Promise<boolean> {
  if (typeof fetch === "undefined") return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const response = await fetch(apiUrl("/api/ping"), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * React hook exposing the best-effort connectivity state.
 * - "online": the API was confirmed reachable recently.
 * - "offline": no network interface, or the API probe failed.
 * - "checking": we have a network interface but haven't confirmed reachability yet.
 */
export function useNetworkStatus() {
  const [state, setState] = useState<ConnectivityState>(
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "checking",
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const runProbe = async () => {
      const hasInterface = typeof navigator === "undefined" ? true : navigator.onLine;
      if (!hasInterface) {
        if (mountedRef.current) setState("offline");
        return;
      }
      const reachable = await probeApiReachable();
      if (!mountedRef.current) return;
      if (reachable) {
        setState("online");
        setLastOnlineAt(Date.now());
      } else {
        setState("offline");
      }
    };

    void runProbe();
    const intervalId = window.setInterval(runProbe, PING_INTERVAL_MS);

    const handleOnline = () => void runProbe();
    const handleOffline = () => mountedRef.current && setState("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let removeNativeListener: (() => void) | null = null;
    void getNetworkPlugin().then((Network) => {
      if (!Network) return;
      Network.addListener("networkStatusChange", (status) => {
        if (!status.connected) {
          mountedRef.current && setState("offline");
        } else {
          void runProbe();
        }
      }).then((handle) => {
        removeNativeListener = () => void handle.remove();
      });
    });

    // Re-probe when the app comes back to the foreground (camp scenario:
    // phone regains signal while the app was backgrounded).
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void runProbe();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      removeNativeListener?.();
    };
  }, []);

  return { status: state, isOnline: state === "online", isOffline: state === "offline", lastOnlineAt };
}

/** One-off check, for code paths outside React components (e.g. the sync engine). */
export async function isApiReachableNow(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  return probeApiReachable();
}
