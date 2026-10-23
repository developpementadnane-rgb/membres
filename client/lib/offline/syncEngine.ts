import { useEffect, useRef } from "react";
import { confirmAttendancePin } from "@/lib/api";
import { isApiReachableNow } from "./network";
import { listPendingSyncItems, updateSyncItem, removeSyncItem, listSyncQueue } from "./syncQueue";
import { listQrRecords, markQrRecordSynced, purgeStaleQrRecords } from "./qrOfflineStore";
import { revealPin } from "./pinProtection";
import type { SyncQueueItem } from "./types";

const MAX_ATTEMPTS = 8;
const AUTO_SYNC_INTERVAL_MS = 60_000;

let syncInFlight = false;

interface AttendanceConfirmPayload {
  qrRecordId: string;
}

async function processAttendanceConfirm(item: SyncQueueItem<AttendanceConfirmPayload>): Promise<void> {
  const records = await listQrRecords();
  const record = records.find((r) => r.id === item.payload.qrRecordId);

  if (!record) {
    // Nothing to replay (e.g. already cleaned up); drop the queue item.
    await removeSyncItem(item.id);
    return;
  }

  if (record.synced) {
    await removeSyncItem(item.id);
    return;
  }

  const pin = await revealPin(record.pin_reference);

  try {
    const result = await confirmAttendancePin(record.qr_identifier, pin);
    await markQrRecordSynced(record.id, {
      outcome: "success",
      sessionTitle: result.session.title,
      sessionDate: result.session.date,
    });
    await removeSyncItem(item.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // "already recorded" / "already used" responses are the idempotency
    // guard on the server doing its job -- treat as a successful sync, not
    // a failure, so we never show the member a false error for something
    // that in fact went through (e.g. a retry after a flaky connection).
    if (/مسبق|already|duplicate/i.test(message)) {
      await markQrRecordSynced(record.id, { outcome: "already_recorded" });
      await removeSyncItem(item.id);
      return;
    }
    // A definitive rejection (expired/invalid/wrong PIN) -- stop retrying,
    // surface it to the member instead of looping forever.
    if (/PIN غير صحيح|رمز QR غير صالح|انتهت صلاحية/i.test(message)) {
      await markQrRecordSynced(record.id, { outcome: "rejected", error: message });
      await removeSyncItem(item.id);
      return;
    }
    throw error; // transient/server error: keep the item queued for retry
  }
}

/** Processes every pending item in the queue, once. Safe to call repeatedly;
 * each operation is idempotent server-side so replays never double-record. */
export async function runSync(): Promise<{ processed: number; failed: number }> {
  if (syncInFlight) return { processed: 0, failed: 0 };
  syncInFlight = true;
  let processed = 0;
  let failed = 0;

  try {
    const reachable = await isApiReachableNow();
    if (!reachable) return { processed: 0, failed: 0 };

    const pending = await listPendingSyncItems();
    for (const item of pending) {
      const stillReachable = await isApiReachableNow();
      if (!stillReachable) break; // connection dropped mid-sync; stop, resume later

      const workingItem: SyncQueueItem = { ...item, status: "syncing" };
      await updateSyncItem(workingItem);

      try {
        if (item.type === "attendance_confirm") {
          await processAttendanceConfirm(item as SyncQueueItem<AttendanceConfirmPayload>);
        }
        processed += 1;
      } catch (error) {
        failed += 1;
        const attempts = item.attempts + 1;
        const message = error instanceof Error ? error.message : String(error);
        await updateSyncItem({
          ...item,
          attempts,
          last_error: message,
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        });
      }
    }

    await purgeStaleQrRecords();
  } finally {
    syncInFlight = false;
  }

  return { processed, failed };
}

export async function hasPendingSyncItems(): Promise<boolean> {
  const queue = await listSyncQueue();
  return queue.some((item) => item.status === "pending" || item.status === "syncing" || item.status === "failed");
}

/** React hook: automatically replays the sync queue whenever the app is
 * confirmed online, on an interval, and again whenever `isOnline` flips
 * from false to true. */
export function useAutoSync(isOnline: boolean) {
  const wasOnlineRef = useRef(false);

  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      void runSync();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isOnline) void runSync();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isOnline]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void runSync();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);
}
