/**
 * Minimal promise-based IndexedDB helper.
 *
 * We intentionally avoid pulling in the `idb` package to keep the offline
 * layer dependency-free and easy to reason about inside the Capacitor
 * WebView. IndexedDB is available in Capacitor's Android WebView (modern
 * system WebView) and in every desktop/mobile browser we target.
 */

export const DB_NAME = "shm_member_offline_db";
export const DB_VERSION = 1;

export const STORES = {
  memberProfile: "member_profile", // keyPath: "member_id" -- cached personal info
  membership: "membership", // keyPath: "id" ("<member_id>_<year>") -- adhésion status + documents
  qrRecords: "qr_records", // keyPath: "id" -- offline_qr_records (attendance QR/PIN scans)
  syncQueue: "sync_queue", // keyPath: "id" -- generic pending-sync operations
  meta: "meta", // keyPath: "key" -- small misc values (last_sync_at, etc.)
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.memberProfile)) {
        db.createObjectStore(STORES.memberProfile, { keyPath: "member_id" });
      }
      if (!db.objectStoreNames.contains(STORES.membership)) {
        db.createObjectStore(STORES.membership, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.qrRecords)) {
        const store = db.createObjectStore(STORES.qrRecords, { keyPath: "id" });
        store.createIndex("by_synced", "synced", { unique: false });
        store.createIndex("by_qr_identifier", "qr_identifier", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const store = db.createObjectStore(STORES.syncQueue, { keyPath: "id" });
        store.createIndex("by_status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another open tab."));
  });

  return dbPromise;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet<T = unknown>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return (await promisifyRequest(store.get(key))) as T | undefined;
}

export async function idbGetAll<T = unknown>(storeName: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return (await promisifyRequest(store.getAll())) as T[];
}

export async function idbPut<T = unknown>(storeName: string, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function idbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function idbClearStore(storeName: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Safe wrapper: never throws, returns `fallback` if IndexedDB isn't usable (older WebViews, private mode edge cases). */
export async function safeIdb<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error("[offline/idb] operation failed:", error);
    return fallback;
  }
}
