import { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Galerie multimédia partagée entre membres et chefs (comme un mini fil
 * d'actualité par jour). Stockage Supabase Storage (pas Cloudflare R2 --
 * carte bancaire indisponible pour l'instant côté association), suit
 * exactement le même schéma que le PDF/QR d'inscription dans ce même
 * fichier auth.ts : data URL base64 en entrée, upload via le client
 * admin (service_role), URL publique renvoyée au client.
 */

const GALLERY_BUCKET = "galerie";
const MAX_BASE64_LENGTH = 70_000_000; // ~50 Mo décodé, marge pour l'overhead base64

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials for gallery storage.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureBucket(adminClient: ReturnType<typeof getSupabaseAdminClient>) {
  const { data: bucket, error: bucketError } = await adminClient.storage.getBucket(GALLERY_BUCKET);
  if (bucket) return;
  if (bucketError && bucketError.statusCode !== "404") throw bucketError;

  const { error: createError } = await adminClient.storage.createBucket(GALLERY_BUCKET, {
    public: true,
    fileSizeLimit: "50MB",
  });
  if (createError && createError.statusCode !== "409") throw createError;
}

const ALLOWED_MIME: Record<string, { ext: string; type: "image" | "video" }> = {
  "image/jpeg": { ext: "jpg", type: "image" },
  "image/png": { ext: "png", type: "image" },
  "image/webp": { ext: "webp", type: "image" },
  "image/gif": { ext: "gif", type: "image" },
  "video/mp4": { ext: "mp4", type: "video" },
  "video/quicktime": { ext: "mov", type: "video" },
  "video/webm": { ext: "webm", type: "video" },
};

function decodeMediaDataUrl(value: unknown): { buffer: Buffer; mime: string; ext: string; mediaType: "image" | "video" } {
  if (typeof value !== "string") throw new Error("Fichier manquant ou invalide.");
  const [header, base64] = value.split(",", 2);
  const mimeMatch = /^data:([^;]+);base64$/.exec(header ?? "");
  if (!mimeMatch || !base64) throw new Error("Format de fichier invalide (data URL attendue).");
  const mime = mimeMatch[1];
  const known = ALLOWED_MIME[mime];
  if (!known) throw new Error(`Type de fichier non supporté : ${mime}. Formats acceptés : JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM.`);
  if (base64.length > MAX_BASE64_LENGTH) throw new Error("Fichier trop volumineux (50 Mo maximum).");
  return { buffer: Buffer.from(base64, "base64"), mime, ext: known.ext, mediaType: known.type };
}

/**
 * POST /api/gallery
 * Body: { mediaDataUrl: string, description?: string }
 * Requires requireAuth (sets req.user_id to the member's users.id).
 */
export const handleUploadMedia: RequestHandler = async (req, res) => {
  const userId = (req as unknown as { user_id?: string }).user_id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const description = typeof req.body?.description === "string" ? req.body.description.trim().slice(0, 500) : null;

  try {
    const { buffer, mime, ext, mediaType } = decodeMediaDataUrl(req.body?.mediaDataUrl);
    const admin = getSupabaseAdminClient();
    await ensureBucket(admin);

    const { data: member, error: memberError } = await admin
      .from("users")
      .select("first_name, last_name")
      .eq("id", userId)
      .maybeSingle();
    if (memberError) throw memberError;

    const path = `${userId}/${Date.now()}-${randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage.from(GALLERY_BUCKET).upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (uploadError) {
      console.error("Gallery upload error:", uploadError);
      return res.status(400).json({ error: "Échec de l'envoi du fichier" });
    }

    const { data: urlData } = admin.storage.from(GALLERY_BUCKET).getPublicUrl(path);

    const { data: row, error: insertError } = await admin
      .from("galerie_medias")
      .insert({
        media_url: urlData.publicUrl,
        media_type: mediaType,
        description,
        user_id: userId,
        first_name: member?.first_name ?? null,
        last_name: member?.last_name ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Gallery insert error:", insertError);
      return res.status(500).json({ error: "Fichier envoyé mais impossible de l'enregistrer" });
    }

    res.json({ success: true, media: row });
  } catch (error) {
    console.error("Gallery upload error:", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Échec de l'envoi" });
  }
};

/**
 * GET /api/gallery
 * Public to any authenticated member/chef -- returns everything, newest
 * first. The client groups it by day for the "galerie chronologique" view.
 */
export const handleListMedia: RequestHandler = async (_req, res) => {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("galerie_medias")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json({ media: data ?? [] });
  } catch (error) {
    console.error("Gallery list error:", error);
    res.status(500).json({ error: "Impossible de charger la galerie" });
  }
};

/**
 * DELETE /api/gallery/:id
 * A member may only delete their OWN post (accidental upload, wrong
 * file, etc.). Full moderation (delete anyone's post) lives on the
 * chefs' side -- see Qiadati's server/routes/gallery.ts.
 */
export const handleDeleteMedia: RequestHandler = async (req, res) => {
  const userId = (req as unknown as { user_id?: string }).user_id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;
  try {
    const admin = getSupabaseAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("galerie_medias")
      .select("id, user_id, media_url")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: "Publication introuvable" });
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: "Vous ne pouvez supprimer que vos propres publications" });
    }

    const path = existing.media_url.split(`/${GALLERY_BUCKET}/`)[1];
    if (path) await admin.storage.from(GALLERY_BUCKET).remove([path]);

    const { error: deleteError } = await admin.from("galerie_medias").delete().eq("id", id);
    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error) {
    console.error("Gallery delete error:", error);
    res.status(500).json({ error: "Impossible de supprimer cette publication" });
  }
};
