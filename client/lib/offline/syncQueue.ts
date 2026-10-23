import { STORES, idbGetAll, idbPut, idbDelete, safeIdb } from "./idb";
import type { SyncOperationType, SyncQueueItem } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function enqueueSyncItem<TPayload>(
  type: SyncOperationType,
  payload: TPayload,
  relatedRecordId?: string,
): Promise<SyncQueueItem<TPayload>> {
  const item: SyncQueueItem<TPayload> = {
    id: newId(),
    type,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
    status: "pending",
    related_record_id: relatedRecordId,
  };
  await safeIdb(() => idbPut(STORES.syncQueue, item), undefined);
  return item;
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  return safeIdb(() => idbGetAll<SyncQueueItem>(STORES.syncQueue), []);
}

export async function listPendingSyncItems(): Promise<SyncQueueItem[]> {
  const all = await listSyncQueue();
  return all
    .filter((item) => item.status === "pending" || item.status === "failed")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function updateSyncItem(item: SyncQueueItem): Promise<void> {
  await safeIdb(() => idbPut(STORES.syncQueue, item), undefined);
}

export async function removeSyncItem(id: string): Promise<void> {
  await safeIdb(() => idbDelete(STORES.syncQueue, id), undefined);
}
