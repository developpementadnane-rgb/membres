import { STORES, idbGetAll, idbPut, idbDelete, safeIdb } from "./idb";
import { protectPin } from "./pinProtection";
import type { OfflineQrRecord } from "./types";

const RETENTION_DAYS = 30; // safety-net purge for very old, never-synced records

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `qr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function listQrRecords(): Promise<OfflineQrRecord[]> {
  const records = await safeIdb(() => idbGetAll<OfflineQrRecord>(STORES.qrRecords), []);
  return records.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
}

export async function listPendingQrRecords(): Promise<OfflineQrRecord[]> {
  const all = await listQrRecords();
  return all.filter((r) => !r.synced);
}

/** Records a scan+PIN attempt made while offline. Avoids duplicates for the
 * same qr_identifier that hasn't synced yet. Returns the stored (unprotected
 * in-memory) record; the PIN itself is encrypted before being persisted. */
export async function queueOfflineQrScan(input: {
  qrIdentifier: string;
  pin: string;
  expiresAt: string | null;
}): Promise<OfflineQrRecord> {
  const existing = await listQrRecords();
  const duplicate = existing.find((r) => r.qr_identifier === input.qrIdentifier && !r.synced);
  if (duplicate) return duplicate;

  const now = new Date().toISOString();
  const record: OfflineQrRecord = {
    id: newId(),
    qr_identifier: input.qrIdentifier,
    pin_reference: await protectPin(input.pin),
    scanned_at: now,
    expires_at: input.expiresAt,
    used: false,
    synced: false,
    sync_result: null,
    sync_error: null,
    created_at: now,
  };

  await safeIdb(() => idbPut(STORES.qrRecords, record), undefined);
  return record;
}

export async function markQrRecordSynced(
  id: string,
  result: { outcome: "success" | "already_recorded" | "rejected"; error?: string; sessionTitle?: string; sessionDate?: string },
): Promise<void> {
  const all = await listQrRecords();
  const record = all.find((r) => r.id === id);
  if (!record) return;

  const updated: OfflineQrRecord = {
    ...record,
    synced: true,
    used: result.outcome !== "rejected",
    sync_result: result.outcome,
    sync_error: result.error ?? null,
    session_title: result.sessionTitle ?? record.session_title,
    session_date: result.sessionDate ?? record.session_date,
    // The PIN has done its job (or failed permanently); do not keep it around.
    pin_reference: "",
  };

  await safeIdb(() => idbPut(STORES.qrRecords, updated), undefined);
}

export async function purgeStaleQrRecords(): Promise<void> {
  const all = await listQrRecords();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const record of all) {
    const shouldPurge = record.synced ? new Date(record.scanned_at).getTime() < cutoff : false;
    if (shouldPurge) {
      await safeIdb(() => idbDelete(STORES.qrRecords, record.id), undefined);
    }
  }
}
