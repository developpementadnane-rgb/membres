import { supabase } from './supabase';
import { apiUrl } from './api-config';
import { AuthExpiredError, emitAuthExpired } from './offline/authEvents';
import { getStoredToken } from './offline/sessionStore';

export interface AttendanceSession {
  id: string;
  title: string;
  session_date: string;
}

export interface AttendanceRecord {
  id: string;
  present: boolean;
  created_at: string;
  session: AttendanceSession | null;
}

export interface AttendanceConfirmation {
  success: true;
  session: { title: string; date: string };
  attendance: { present: true };
}

export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  // Was `localStorage.getItem("authToken")` -- wrong on native, see the
  // comment on getStoredToken() in sessionStore.ts for why.
  const token = await getStoredToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch (networkError) {
    // A thrown TypeError here means the request never reached the server
    // (no connectivity) -- this must never be treated as a session expiry.
    throw networkError;
  }

  if (response.status === 401) {
    // The server explicitly rejected the token: it is genuinely
    // expired/invalid, as opposed to the request simply not going through.
    emitAuthExpired();
    throw new AuthExpiredError();
  }

  return response;
}

async function parseApiError(response: Response) {
  const body = await response.json().catch(() => null);
  throw new Error(body?.error || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
}

export async function fetchAttendance(): Promise<AttendanceRecord[]> {
  const response = await authenticatedFetch("/api/attendance");
  if (!response.ok) await parseApiError(response);
  return response.json();
}

export async function verifyAttendanceQr(token: string) {
  const response = await authenticatedFetch("/api/attendance/verify-qr", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  if (!response.ok) await parseApiError(response);
  return response.json() as Promise<{ valid: true }>;
}

export async function confirmAttendancePin(token: string, pin: string): Promise<AttendanceConfirmation> {
  const response = await authenticatedFetch("/api/attendance/confirm-pin", {
    method: "POST",
    body: JSON.stringify({ token, pin }),
  });
  if (!response.ok) await parseApiError(response);
  return response.json();
}

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface Report {
  id: string;
  title: string;
  location?: string | null;
  time?: string | null;
  objective?: string | null;
  participants_boys: number;
  participants_girls: number;
  leaders_count: number;
  responsible?: string | null;
  category?: string | null;
  beneficiary?: string | null;
  description_original?: string | null;
  description_reformulated?: string | null;
  evaluation_positive?: string | null;
  evaluation_negative?: string | null;
  recommendations?: string | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  title: string;
  date_time?: string;
  location?: string;
  target_audience?: string;
  objective?: string;
  methodology_original?: string;
  methodology_reformulated?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  user_id?: string;
  full_name: string;
  role?: string;
  phone?: string;
  team?: string;
  profile_photo?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// ========================================
// REPORTS API
// ========================================

/**
 * Fetch all reports
 */
export async function fetchReports(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('daily_camp_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return [];
    }

    return data as Report[];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

/**
 * Fetch a single report by ID
 */
export async function fetchReportById(id: string): Promise<Report | null> {
  try {
    const { data, error } = await supabase
      .from('daily_camp_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      return null;
    }

    return data as Report;
  } catch (error) {
    console.error('Error fetching report:', error);
    return null;
  }
}

/**
 * Fetch reports by category
 */
export async function fetchReportsByCategory(category: string): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('daily_camp_reports')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports by category:', error);
      return [];
    }

    return data as Report[];
  } catch (error) {
    console.error('Error fetching reports by category:', error);
    return [];
  }
}

/**
 * Fetch reports summary view
 */
export async function fetchReportsSummary(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('daily_camp_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports summary:', error);
      return [];
    }

    return data as Report[];
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    return [];
  }
}

// ========================================
// SESSIONS API
// ========================================

/**
 * Fetch all sessions
 */
export async function fetchSessions(): Promise<Session[]> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('date_time', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return data as Session[];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

/**
 * Fetch a single session by ID
 */
export async function fetchSessionById(id: string): Promise<Session | null> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }

    return data as Session;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Fetch upcoming sessions (future dates)
 */
export async function fetchUpcomingSessions(): Promise<Session[]> {
  try {
    const { data, error } = await supabase
      .from('upcoming_sessions')
      .select('*');

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
      return [];
    }

    return data as Session[];
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    return [];
  }
}

/**
 * Fetch past sessions (historical)
 */
export async function fetchPastSessions(): Promise<Session[]> {
  try {
    const { data, error } = await supabase
      .from('past_sessions')
      .select('*');

    if (error) {
      console.error('Error fetching past sessions:', error);
      return [];
    }

    return data as Session[];
  } catch (error) {
    console.error('Error fetching past sessions:', error);
    return [];
  }
}

// ========================================
// MEMBERS API
// ========================================

/**
 * Fetch all members (from users table)
 */
export async function fetchMembers(): Promise<Member[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return [];
    }

    return data as Member[];
  } catch (error) {
    console.error('Error fetching members:', error);
    return [];
  }
}

/**
 * Fetch a single member by ID (from users table)
 */
export async function fetchMemberById(id: string): Promise<Member | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching member:', error);
      return null;
    }

    return data as Member;
  } catch (error) {
    console.error('Error fetching member:', error);
    return null;
  }
}

/**
 * Fetch members by team (from users table)
 */
export async function fetchMembersByTeam(team: string): Promise<Member[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('patrol_id', team)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching members by team:', error);
      return [];
    }

    return data as Member[];
  } catch (error) {
    console.error('Error fetching members by team:', error);
    return [];
  }
}

/**
 * Create or update member profile (authenticated user only)
 */
export async function upsertMemberProfile(member: Partial<Member>): Promise<Member | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(member, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting member:', error);
      return null;
    }

    return data as Member;
  } catch (error) {
    console.error('Error upserting member:', error);
    return null;
  }
}

/**
 * Get current user's member profile from users table
 */
export async function getCurrentUserProfile(): Promise<Member | null> {
  try {
    // Get generated_id from localStorage (set during login)
    const generatedId = localStorage.getItem('user_generated_id');

    if (!generatedId) {
      console.error('No user ID found');
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('generated_id', generatedId)
      .single();

    if (error) {
      console.error('Error fetching current user profile:', error);
      return null;
    }

    return data as Member;
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    return null;
  }
}

// ========================================
// STORAGE API
// ========================================

/**
 * Upload a file to storage bucket
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}
