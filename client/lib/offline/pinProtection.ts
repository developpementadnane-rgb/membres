/**
 * At-rest protection for PINs that must be queued locally while offline.
 *
 * Why we need the PIN at all: attendance confirmation is validated
 * server-side (bcrypt compare against a hash tied to a single-use QR
 * challenge). To replay a queued confirmation once connectivity returns we
 * must send the original PIN again -- there is no offline-verifiable
 * derived value we can substitute without changing the server's security
 * model. So instead of plaintext, we encrypt it at rest with a per-device
 * AES-GCM key (Web Crypto), and the record is deleted the moment it syncs
 * (see qrOfflineStore.purgeSynced / syncEngine).
 *
 * This is NOT a substitute for server-side validation; it only prevents the
 * PIN from sitting as plain text inside IndexedDB while queued.
 */
import { STORES, idbGet, idbPut, safeIdb } from "./idb";

const META_KEY = "pin_protection_key_v1";

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = await safeIdb(() => idbGet<{ key: string; value: string }>(STORES.meta, META_KEY), undefined);

  if (existing?.value) {
    const raw = fromBase64(existing.value);
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const exported = await crypto.subtle.exportKey("raw", key);
  await safeIdb(() => idbPut(STORES.meta, { key: META_KEY, value: toBase64(exported) }), undefined);
  return key;
}

const hasWebCrypto = typeof crypto !== "undefined" && !!crypto.subtle;

/** Returns an opaque, encrypted string. Falls back to a reversible-but-obfuscated
 * encoding if Web Crypto is unavailable (very old WebView), never plaintext. */
export async function protectPin(pin: string): Promise<string> {
  if (!hasWebCrypto) return `obf:${btoa(unescape(encodeURIComponent(pin)))}`;
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(pin);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `gcm:${toBase64(iv.buffer)}:${toBase64(ciphertext)}`;
}

export async function revealPin(protectedValue: string): Promise<string> {
  if (protectedValue.startsWith("obf:")) {
    return decodeURIComponent(escape(atob(protectedValue.slice(4))));
  }
  if (protectedValue.startsWith("gcm:")) {
    const [, ivB64, dataB64] = protectedValue.split(":");
    const key = await getOrCreateKey();
    const iv = fromBase64(ivB64);
    const ciphertext = fromBase64(dataB64);
    const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuffer);
  }
  throw new Error("Unrecognized protected PIN format.");
}
