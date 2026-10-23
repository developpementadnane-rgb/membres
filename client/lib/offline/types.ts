// Shared type definitions for the offline layer.

/** The subset of a member's personal record needed for offline display.
 * Deliberately excludes anything not required offline (e.g. raw password hash).
 *
 * Single source of truth: every field here comes from the `users` table
 * (via GET /api/auth/profile) and only from there -- never partially
 * from `member_profiles` and partially from `users`, which would risk
 * the two silently disagreeing. */
export interface OfflineMemberProfile {
  id: string;
  generated_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  user_phone: string;
  home_phone?: string | null;
  father_phone?: string | null;
  mother_phone?: string | null;
  patrol_id?: string | null;
  patrol_name?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  is_high_patrol?: boolean;
  guardian_first_name?: string | null;
  guardian_last_name?: string | null;
  guardian_relationship?: string | null;
  guardian_cin?: string | null;
  additional_info?: string | null;
  pdf_url?: string | null;
  qr_code_url?: string | null;
  documents_generated_at?: string | null;
  /** Membership status -- both booleans live directly on `users`; there
   * is no separate membership table/history in the real schema. */
  payment_completed?: boolean;
  documents_completed?: boolean;
}

/** A locally-scanned attendance QR + PIN attempt (offline_qr_records). */
export interface OfflineQrRecord {
  id: string;
  qr_identifier: string; // qr_token extracted from the scanned QR
  pin_reference: string; // see qrOfflineStore.ts for how this is protected
  scanned_at: string;
  expires_at: string | null;
  used: boolean;
  synced: boolean;
  sync_result?: "success" | "already_recorded" | "rejected" | null;
  sync_error?: string | null;
  created_at: string;
  session_title?: string | null;
  session_date?: string | null;
}

export type SyncOperationType = "attendance_confirm";

export interface SyncQueueItem<TPayload = unknown> {
  id: string;
  type: SyncOperationType;
  payload: TPayload;
  created_at: string;
  attempts: number;
  last_error: string | null;
  status: "pending" | "syncing" | "synced" | "failed";
  related_record_id?: string; // e.g. the OfflineQrRecord id, for cross-referencing
}
