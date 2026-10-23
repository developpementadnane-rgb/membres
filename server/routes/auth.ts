import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials for document storage.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const QR_CODES_BUCKET = "membres-qr";
const PDF_DOCUMENTS_BUCKET = "membres-pdf";

function normalizeIdentifier(value: unknown): string {
  // Also lowercase: mobile keyboards (Android/APK) frequently auto-capitalize
  // the first letter of a text field (e.g. "e0001" -> "E0001"), which desktop
  // browsers don't do. Without this, a login typed correctly on a phone can
  // fail to match a record saved/typed with different casing on the web.
  return typeof value === "string" ? value.replace(/\s+/g, "").toLowerCase() : "";
}

function generateMemberId(gender: unknown): string {
  const prefix = typeof gender === "string" && gender.toLowerCase() === "female" ? "F" : "E";
  return `${prefix}${randomInt(1000, 10000)}`;
}

function isGeneratedIdConflict(error: { code?: string; message?: string; details?: string } | null): boolean {
  return error?.code === "23505" && /generated_id/i.test(`${error.message || ""} ${error.details || ""}`);
}

function decodeDataUrl(value: unknown, expectedMimeType: string) {
  if (typeof value !== "string") {
    throw new Error("Invalid document data.");
  }

  const [header, base64] = value.split(",", 2);
  if (!header?.startsWith(`data:${expectedMimeType}`) || !header.includes(";base64") || !base64) {
    throw new Error(`Expected a ${expectedMimeType} data URL.`);
  }

  return Buffer.from(base64, "base64");
}

async function ensureBucket(adminClient: ReturnType<typeof getSupabaseAdminClient>, bucketName: string) {
  const { data: bucket, error: bucketError } = await adminClient.storage.getBucket(bucketName);
  if (bucket) return;

  if (bucketError && bucketError.statusCode !== "404") {
    throw bucketError;
  }

  const { error: createError } = await adminClient.storage.createBucket(bucketName, {
    public: true,
  });
  if (createError && createError.statusCode !== "409") {
    throw createError;
  }
}

/**
 * Register a new user
 * Inserts user data into Supabase users table
 */
export const handleGetRegistrationOptions: RequestHandler = async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const [{ data: patrols, error: patrolsError }, { data: roles, error: rolesError }] = await Promise.all([
      adminClient.from("patrols").select("id, name").order("name"),
      adminClient.from("roles").select("id, name").order("name"),
    ]);

    if (patrolsError) throw patrolsError;
    if (rolesError) throw rolesError;

    return res.json({ patrols: patrols ?? [], roles: roles ?? [] });
  } catch (error) {
    console.error("Registration options error:", error);
    return res.status(500).json({ error: "Unable to load registration options" });
  }
};

export const handleRegister: RequestHandler = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      birth_date,
      gender,
      user_phone,
      patrol_id,
      role_id,
      is_high_patrol,
      guardian_first_name,
      guardian_last_name,
      guardian_relationship,
      guardian_relationship_other,
      guardian_cin,
      father_phone,
      mother_phone,
      home_phone,
      additional_info,
      email,
      password,
    } = req.body;

    const normalizedFirstName = normalizeIdentifier(first_name);
    const normalizedLastName = normalizeIdentifier(last_name);
    const normalizedUserPhone = normalizeIdentifier(user_phone);
    const normalizedEmail = normalizeIdentifier(email);

    // Validate required fields
    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !birth_date ||
      !gender ||
      !normalizedUserPhone ||
      !normalizedEmail ||
      !patrol_id ||
      !role_id ||
      !password
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate age (12-20 years)
    const birth = new Date(birth_date);
    if (isNaN(birth.getTime()) || birth > new Date()) {
      return res.status(400).json({ error: "Invalid birth date" });
    }
    const now = new Date();
    let memberAge = now.getFullYear() - birth.getFullYear();
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    ) {
      memberAge--;
    }
    if (memberAge < 12 || memberAge > 20) {
      return res
        .status(400)
        .json({ error: "L'âge doit être compris entre 12 et 20 ans" });
    }

    const adminClient = getSupabaseAdminClient();
    const passwordHash = await bcrypt.hash(password, 12);
    let registrationResult = await adminClient
      .from("users")
      .insert([
        {
          generated_id: generateMemberId(gender),
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          birth_date,
          gender,
          user_phone: normalizedUserPhone,
          email: normalizedEmail,
          patrol_id,
          role_id,
          is_high_patrol: is_high_patrol || false,
          guardian_first_name,
          guardian_last_name,
          guardian_relationship,
          guardian_relationship_other,
          guardian_cin,
          father_phone,
          mother_phone,
          home_phone,
          additional_info,
          password: passwordHash,
        },
      ])
      .select()
      .single();

    for (let attempt = 1; attempt < 10 && isGeneratedIdConflict(registrationResult.error); attempt++) {
      registrationResult = await adminClient
        .from("users")
        .insert([
          {
            generated_id: generateMemberId(gender),
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
            birth_date,
            gender,
            user_phone: normalizedUserPhone,
            email: normalizedEmail,
            patrol_id,
            role_id,
            is_high_patrol: is_high_patrol || false,
            guardian_first_name,
            guardian_last_name,
            guardian_relationship,
            guardian_relationship_other,
            guardian_cin,
            father_phone,
            mother_phone,
            home_phone,
            additional_info,
            password: passwordHash,
          },
        ])
        .select()
        .single();
    }

    const { data, error } = registrationResult;
    if (error) {
      console.error("Supabase error:", error);
      return res
        .status(400)
        .json({ error: error.message || "Registration failed" });
    }

    // Return user data
    res.json({
      id: data.id,
      generated_id: data.generated_id,
      first_name: data.first_name,
      last_name: data.last_name,
      user_phone: data.user_phone,
      email: data.email,
      gender: data.gender,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Login user
 * Validates first_name, last_name, generated_id or UUID, and password against Supabase users table
 */
export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { first_name, last_name, generated_id, uuid, password } = req.body;
    const normalizedFirstName = normalizeIdentifier(first_name);
    const normalizedLastName = normalizeIdentifier(last_name);
    const normalizedGeneratedId = normalizeIdentifier(generated_id);
    const normalizedUuid = typeof uuid === "string" ? uuid.trim().toLowerCase() : "";

    if (!normalizedFirstName || !normalizedLastName || (!normalizedGeneratedId && !normalizedUuid) || !password) {
      return res.status(400).json({
        error: "First name, last name, ID ou UUID, and password are required"
      });
    }

    // Compare normalized values so legacy rows containing accidental spaces remain usable.
    const { data: candidates, error } = await getSupabaseAdminClient()
      .from("users")
      .select("id, generated_id, first_name, last_name, user_phone, email, gender, password, qr_code_url, payment_completed, documents_completed");

    const data = candidates?.find((candidate) =>
      normalizeIdentifier(candidate.first_name) === normalizedFirstName
      && normalizeIdentifier(candidate.last_name) === normalizedLastName
      && ((normalizedUuid && String(candidate.id).toLowerCase() === normalizedUuid)
        || (normalizedGeneratedId && normalizeIdentifier(candidate.generated_id) === normalizedGeneratedId))
    );

    if (error || !data) {
      console.error("Login error - user not found:", error);
      return res.status(401).json({
        error: "بيانات الدخول غير صحيحة - تأكد من الاسم ورقم العضو"
      });
    }

    const isHashedPassword = typeof data.password === "string" && data.password.startsWith("$2");
    const passwordMatches = isHashedPassword
      ? await bcrypt.compare(password, data.password)
      : password === data.password;

    if (!passwordMatches) {
      return res.status(401).json({
        error: "كلمة المرور غير صحيحة"
      });
    }

    if (!isHashedPassword) {
      await getSupabaseAdminClient()
        .from("users")
        .update({ password: await bcrypt.hash(password, 12) })
        .eq("id", data.id);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = jwt.sign({ user_id: data.id }, jwtSecret, { expiresIn: "3650d" });

    // Perpetual session by design (like Instagram/WhatsApp): the member is
    // never forced to re-authenticate on their own except by explicit
    // logout. A 10-year token/local-session window is effectively "forever"
    // for this use case without literally never expiring.

    // Return the existing user data plus the 20-day access token, matching
    // the client's persistent local session duration (see
    // client/lib/offline/sessionStore.ts). This keeps online API calls
    // valid for the whole lifetime of the local session instead of expiring
    // silently after the old 12h window while the member is still "logged in".
    res.json({
      id: data.id,
      generated_id: data.generated_id,
      first_name: data.first_name,
      last_name: data.last_name,
      user_phone: data.user_phone,
      email: data.email,
      gender: data.gender,
      qr_code_url: data.qr_code_url,
      payment_completed: !!data.payment_completed,
      documents_completed: !!data.documents_completed,
      token,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get user profile
 * Returns logged-in user's full data (bypasses Supabase RLS via the admin
 * client -- this app authenticates with its own bcrypt+JWT system, not
 * Supabase Auth, so auth.uid() is never set and any RLS policy relying on
 * it would silently block every client-side read of the users table).
 */
export const handleGetProfile: RequestHandler = async (req, res) => {
  try {
    const normalizedGeneratedId = normalizeIdentifier(req.query.generated_id);

    if (!normalizedGeneratedId) {
      return res.status(400).json({ error: "Generated ID is required" });
    }

    const adminClient = getSupabaseAdminClient();

    const { data: candidates, error } = await adminClient.from("users").select("*");

    const data = candidates?.find((candidate) =>
      normalizeIdentifier(candidate.generated_id) === normalizedGeneratedId
    );

    if (error || !data) {
      return res.status(404).json({ error: "User not found" });
    }

    let patrolName: string | null = null;
    let roleName: string | null = null;

    if (data.patrol_id) {
      const { data: patrolData } = await adminClient
        .from("patrols")
        .select("id, name")
        .eq("id", data.patrol_id)
        .single();
      if (patrolData) patrolName = patrolData.name;
    }

    if (data.role_id) {
      const { data: roleData } = await adminClient
        .from("roles")
        .select("id, name")
        .eq("id", data.role_id)
        .single();
      if (roleData) roleName = roleData.name;
    }

    let age = 0;
    if (data.birth_date) {
      const birthDate = new Date(data.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const hasHadBirthdayThisYear =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
      if (!hasHadBirthdayThisYear) age -= 1;
    }

    res.json({ ...data, age, patrol_name: patrolName, role_name: roleName, password: undefined });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Save PDF and QR code for a user
 * Stores the PDF and QR code data in Supabase
 */
export const handleSavePdfQrCode: RequestHandler = async (req, res) => {
  try {
    const {
      user_id,
      generated_id,
      pdf_url: pdfDataUrl,
      qr_code_url: qrDataUrl,
    } = req.body;

    const normalizedGeneratedId = normalizeIdentifier(generated_id);

    if (!user_id || !normalizedGeneratedId || !pdfDataUrl || !qrDataUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const adminClient = getSupabaseAdminClient();
    await ensureBucket(adminClient, PDF_DOCUMENTS_BUCKET);
    await ensureBucket(adminClient, QR_CODES_BUCKET);
    const pdfBucket = adminClient.storage.from(PDF_DOCUMENTS_BUCKET);
    const qrBucket = adminClient.storage.from(QR_CODES_BUCKET);
    const pdfPath = `members/${normalizedGeneratedId}/${normalizedGeneratedId}.pdf`;
    const qrPath = `members/${normalizedGeneratedId}/${normalizedGeneratedId}.png`;

    const { error: pdfUploadError } = await pdfBucket.upload(
      pdfPath,
      decodeDataUrl(pdfDataUrl, "application/pdf"),
      { contentType: "application/pdf", upsert: true },
    );

    if (pdfUploadError) {
      console.error("Supabase PDF upload error:", pdfUploadError);
      return res.status(400).json({ error: `Failed to upload PDF: ${pdfUploadError.message}` });
    }

    const { error: qrUploadError } = await qrBucket.upload(
      qrPath,
      decodeDataUrl(qrDataUrl, "image/png"),
      { contentType: "image/png", upsert: true },
    );

    if (qrUploadError) {
      console.error("Supabase QR upload error:", qrUploadError);
      return res.status(400).json({ error: "Failed to upload QR code" });
    }

    const { data: pdfUrlData } = pdfBucket.getPublicUrl(pdfPath);
    const { data: qrUrlData } = qrBucket.getPublicUrl(qrPath);

    const { data, error } = await getSupabaseAdminClient()
      .from("users")
      .update({
        pdf_url: pdfUrlData.publicUrl,
        qr_code_url: qrUrlData.publicUrl,
        documents_generated_at: new Date().toISOString(),
      })
      .eq("id", user_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res
        .status(400)
        .json({ error: error.message || "Failed to save documents" });
    }

    res.json({
      success: true,
      message: "PDF and QR code saved successfully",
      user: {
        id: data.id,
        generated_id: data.generated_id,
        pdf_url: data.pdf_url,
        qr_code_url: data.qr_code_url,
      },
    });
  } catch (error) {
    console.error("Error saving PDF/QR code:", error);
    res.status(500).json({ error: "Server error" });
  }
};
