import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

/**
 * These routes exist because this app authenticates members with its own
 * bcrypt+JWT system (see auth.ts), NOT Supabase Auth. That means
 * `auth.uid()` is always null from the client's point of view, so any
 * Supabase Row Level Security policy that checks `auth.uid()` silently
 * blocks every direct client read/write -- regardless of whether the
 * member is logged in from this app's perspective. Routing these through
 * the server (which uses the service role key, bypassing RLS entirely)
 * fixes that mismatch.
 */
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** GET /api/documents -- public announcements/documents shown on the dashboard. */
export const handleGetDocuments: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("documents")
      .select("id, title, description, file_url, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading documents:", error);
      return res.status(400).json({ error: "Impossible de charger les documents." });
    }

    res.json({ documents: data ?? [] });
  } catch (error) {
    console.error("Error loading documents:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/** GET /api/reports -- list of activity reports (read-only for members). */
export const handleGetReports: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("reports")
      .select(
        "id, title, location, time, objective, participants_boys, participants_girls, leaders_count, category, beneficiary, description_reformulated, pdf_url, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reports:", error);
      return res.status(400).json({ error: "Impossible de charger les rapports." });
    }

    res.json({ reports: data ?? [] });
  } catch (error) {
    console.error("Error loading reports:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/** GET /api/reports/:id -- single report detail (read-only for members). */
export const handleGetReportById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getSupabaseAdminClient()
      .from("reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error loading report:", error);
      return res.status(400).json({ error: "Impossible de charger le rapport." });
    }

    if (!data) {
      return res.status(404).json({ error: "Rapport introuvable." });
    }

    res.json({ report: data });
  } catch (error) {
    console.error("Error loading report:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/** GET /api/sessions -- scouting session plans. */
export const handleGetSessions: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return res.status(400).json({ error: "Impossible de charger les الحصص." });
    }

    res.json({ sessions: data ?? [] });
  } catch (error) {
    console.error("Error loading sessions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/** POST /api/ideas -- submit a new idea. Requires a valid session (JWT). */
export const handleCreateIdea: RequestHandler = async (req, res) => {
  try {
    const { title, description, budget_estimate, requirements } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const { error } = await getSupabaseAdminClient().from("ideas").insert({
      title: String(title).trim(),
      description: String(description).trim(),
      budget_estimate: budget_estimate ? Number(budget_estimate) : null,
      requirements: requirements ? String(requirements).trim() : null,
    });

    if (error) {
      console.error("Error saving idea:", error);
      return res.status(400).json({ error: error.message || "Failed to save idea" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving idea:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/** POST /api/reports -- submit a daily camp report. Requires a valid session (JWT). */
export const handleCreateReport: RequestHandler = async (req, res) => {
  try {
    const {
      patrol_id,
      report_date,
      morning_program_rating,
      evening_program_rating,
      night_program_rating,
      nutrition_rating,
      relationships_rating,
      general_notes,
    } = req.body;
    if (!patrol_id || !report_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { error } = await getSupabaseAdminClient().from("daily_camp_reports").insert({
      patrol_id: Number(patrol_id),
      report_date,
      morning_program_rating,
      evening_program_rating,
      night_program_rating,
      nutrition_rating,
      relationships_rating,
      general_notes: general_notes ? String(general_notes).trim() : null,
    });

    if (error) {
      console.error("Error saving report:", error);
      return res.status(400).json({ error: error.message || "Failed to save report" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving report:", error);
    res.status(500).json({ error: "Server error" });
  }
};
