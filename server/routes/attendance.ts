import crypto from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "../middleware/requireAuth";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase admin credentials.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function getToken(req: Request) {
  const token = req.body?.token;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

async function findValidChallenge(token: string) {
  const adminClient = getSupabaseAdminClient();
  const { data: challenge, error: challengeError } = await adminClient
    .from("attendance_challenges")
    .select("id, session_id, pin_hash, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (challengeError) throw challengeError;
  if (!challenge) return { response: { status: 404, body: { error: "رمز QR غير صالح." } } };
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    return { response: { status: 410, body: { error: "انتهت صلاحية رمز QR. يرجى مسح الرمز الحالي المعروض من طرف القائد." } } };
  }
  if (challenge.used_at) {
    return { response: { status: 409, body: { error: "تم استخدام رمز QR هذا مسبقًا. يرجى مسح الرمز الجديد." } } };
  }

  const { data: session, error: sessionError } = await adminClient
    .from("sessions")
    .select("id, title, session_date:date_time, is_open")
    .eq("id", challenge.session_id)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session || !session.is_open) {
    return { response: { status: 423, body: { error: "هذه الحصة غير متاحة حاليًا لتسجيل الحضور." } } };
  }

  return { adminClient, challenge, session };
}

export async function handleVerifyQr(req: Request, res: Response) {
  try {
    const token = getToken(req);
    if (!token) return res.status(400).json({ error: "رمز QR غير صالح." });
    const result = await findValidChallenge(token);
    if ("response" in result) return res.status(result.response.status).json(result.response.body);
    return res.json({ valid: true });
  } catch (error) {
    console.error("QR verification error:", error);
    return res.status(500).json({ error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." });
  }
}

export async function handleConfirmPin(req: Request, res: Response) {
  try {
    const authenticatedRequest = req as unknown as AuthenticatedRequest;
    const token = getToken(req);
    const pin = typeof req.body?.pin === "string" ? req.body.pin.trim() : "";
    if (!token || !pin) return res.status(401).json({ error: "رمز PIN غير صحيح. حاول مرة أخرى." });

    const result = await findValidChallenge(token);
    if ("response" in result) return res.status(result.response.status).json(result.response.body);
    if (!await bcrypt.compare(pin, result.challenge.pin_hash)) {
      return res.status(401).json({ error: "رمز PIN غير صحيح. حاول مرة أخرى." });
    }

    const { data: existingAttendance, error: existingError } = await result.adminClient
      .from("attendance")
      .select("id")
      .eq("member_id", authenticatedRequest.user_id)
      .eq("session_id", result.challenge.session_id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingAttendance) {
      return res.status(409).json({ error: "تم تسجيل حضورك لهذه الحصة مسبقًا." });
    }

    const { error: transactionError } = await result.adminClient.rpc("record_attendance", {
      p_member_id: authenticatedRequest.user_id,
      p_challenge_id: result.challenge.id,
    });

    if (transactionError) throw transactionError;

    return res.json({
      success: true,
      session: { title: result.session.title, date: result.session.session_date },
      attendance: { present: true },
    });
  } catch (error) {
    console.error("Attendance confirmation error:", error);
    return res.status(500).json({ error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." });
  }
}

export async function handleGetAttendance(req: Request, res: Response) {
  try {
    const authenticatedRequest = req as unknown as AuthenticatedRequest;
    const { data, error } = await getSupabaseAdminClient()
      .from("attendance")
      .select("id, present, created_at, session:sessions(id, title, session_date:date_time)")
      .eq("member_id", authenticatedRequest.user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data ?? []);
  } catch (error) {
    console.error("Attendance history error:", error);
    return res.status(500).json({ error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." });
  }
}
