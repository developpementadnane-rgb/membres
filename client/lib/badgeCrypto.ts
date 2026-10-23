/**
 * Shared badge encryption module -- IDENTICAL COPY lives in both the
 * members portal (which calls encryptBadgePayload) and the chefs
 * portal (which calls decryptBadgePayload, for both the attendance
 * scan and the emergency-access page). There is only ONE crypto
 * system: this file. Do not fork the logic between the two apps --
 * if you need to change the format, change it here, bump
 * FORMAT_VERSION, and copy the updated file to both repos together.
 *
 * Algorithm: AES-256-GCM via the Web Crypto API (crypto.subtle),
 * available natively in any modern browser/WebView -- no external
 * crypto dependency needed on either side.
 *   - AES-GCM is authenticated: a tampered badge fails to decrypt
 *     rather than silently producing wrong-but-plausible data.
 *   - Works fully offline on both ends once the key is baked into
 *     the build (see VITE_BADGE_ENCRYPTION_KEY below) -- no network
 *     call is ever made to encrypt or decrypt a badge.
 *
 * Key handling:
 *   - A single 256-bit key, generated once, base64-encoded, and
 *     stored as the VITE_BADGE_ENCRYPTION_KEY secret in BOTH repos'
 *     GitHub Actions secrets (never committed in plaintext).
 *   - Same key on both sides -- this is symmetric encryption, not
 *     public/private key. Rotating the key means updating it in both
 *     repos at the same time, or old badges stop decrypting.
 *
 * Wire format v S3 (what ends up inside the QR):
 *   "S3.<encrypted-payload-base64url>"
 *   (plain text, NOT a data:text/html page -- a stock camera app that
 *   scans this just sees an opaque token like "S3.aBcD12...", never
 *   any personal info, which satisfies the "no leak on generic scan"
 *   requirement without paying for an HTML/base64 wrapper.)
 *
 *   <encrypted-payload-base64url> decodes to:
 *     [12 bytes random IV] + [AES-GCM ciphertext, tag included]
 *
 * The decrypted plaintext (UTF-8) is itself JSON -- see
 * BadgeMemberPayload below. Deliberately kept to the minimum needed
 * for (a) presence/absence: id + name, and (b) emergencies: birth
 * date + guardian contacts + medical/additional info. NOT a copy of
 * the member's full file (no phone, patrol, role, gender...) -- that
 * belongs on the PDF, not the QR.
 */

const FORMAT_VERSION = "S3";

export interface BadgeMemberPayload {
  i: string; // id (generated_id, human-facing scout ID) -- used for presence/absence
  f: string; // firstName
  l: string; // lastName
  b: string | null; // birthDate
  gf: string | null; // guardianFirstName (tuteur/père/mère)
  gl: string | null; // guardianLastName
  gp: string | null; // guardianPhone (contact prioritaire, ex: père)
  gp2: string | null; // guardianPhone2 (contact secondaire, ex: mère), si existant
  m: string | null; // medicalInfo -- antécédents médicaux / traitements ("informations supplémentaires")
}

// ---- key handling -----------------------------------------------------

let cachedKeyPromise: Promise<CryptoKey> | null = null;

function getRawKeyBase64(): string {
  const key = import.meta.env.VITE_BADGE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "VITE_BADGE_ENCRYPTION_KEY is not set. Badge encryption/decryption cannot work without it -- check your .env / GitHub secrets.",
    );
  }
  return key;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// base64url (QR-safe, no +/= characters) <-> bytes
function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  return base64ToBytes(padded);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getKey(): Promise<CryptoKey> {
  if (!cachedKeyPromise) {
    cachedKeyPromise = crypto.subtle.importKey(
      "raw",
      base64ToBytes(getRawKeyBase64()),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }
  return cachedKeyPromise;
}

// ---- encrypt (members portal side) -------------------------------------

/**
 * Encrypts a member's badge payload. Call this from the members
 * portal when generating a badge (registration, badge reprint, etc).
 * Returns a short opaque token ("S3.<base64url>") ready to feed
 * straight to a QR-code generator. Scanned by a stock camera app, it
 * shows only that meaningless token -- no HTML page, no personal
 * data -- which is what keeps the QR light enough to actually fit in
 * a scannable code even with medical/guardian info included.
 */
export async function encryptBadgePayload(
  payload: BadgeMemberPayload,
): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return `${FORMAT_VERSION}.${bytesToBase64Url(combined)}`;
}

// ---- decrypt (chefs portal side) ---------------------------------------

export interface DecodedBadge {
  valid: boolean;
  payload?: BadgeMemberPayload;
}

/**
 * Decrypts a scanned badge. Call this from the chefs portal (both
 * the attendance scan and the emergency-access page share this same
 * function -- see memberBadge.ts).
 */
export async function decryptBadgePayload(raw: string): Promise<DecodedBadge> {
  const prefix = `${FORMAT_VERSION}.`;
  if (!raw.startsWith(prefix)) return { valid: false };

  try {
    const combined = base64UrlToBytes(raw.slice(prefix.length));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await getKey();
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const payload = JSON.parse(
      new TextDecoder().decode(plaintextBuffer),
    ) as BadgeMemberPayload;

    if (!payload.i || !payload.f) return { valid: false };

    return { valid: true, payload };
  } catch {
    // Wrong key, tampered payload, malformed QR, or an unrelated QR
    // entirely -- all collapse to "not a valid badge" on purpose, so
    // the scanner can keep trying silently on every camera frame.
    // Downside: a MISSING or WRONG key produces the exact same silent
    // "invalid badge" with zero error trace anywhere. getKeyFingerprint()
    // below exists specifically to let a human debug that blind spot.
    return { valid: false };
  }
}

// ---- diagnostics --------------------------------------------------------

/**
 * Returns a short, NON-REVERSIBLE fingerprint of the badge key
 * currently baked into this build (first 8 hex chars of SHA-256 of
 * the raw key bytes) -- never the key itself. Compare this string
 * between the members portal and the chefs portal (e.g. in each
 * app's browser console, or wherever it's surfaced in the UI): if
 * they differ, that alone proves point 1 (QR unreadable) is a key
 * mismatch between the two deployments, not a code bug. If they're
 * identical and scanning still fails, the key is not the problem.
 */
export async function getKeyFingerprint(): Promise<string> {
  try {
    const raw = getRawKeyBase64();
    const bytes = base64ToBytes(raw);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return bytesToBase64Url(new Uint8Array(digest)).slice(0, 8);
  } catch {
    return "ABSENTE"; // VITE_BADGE_ENCRYPTION_KEY not set on this build at all.
  }
}
