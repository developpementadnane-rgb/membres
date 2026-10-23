import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";

const PIN_TTL_MS = 5 * 60 * 1000;

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials are missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// .trim() : un espace ou un retour à la ligne collé dans Netlify suffit à faire échouer l'authentification
const smtpUser = (process.env.SMTP_USER || "").replace(/[^\x21-\x7E]/g, "");
const smtpPass = (process.env.SMTP_PASS || "").replace(/[^\x21-\x7E]/g, "");

// Pas de diagnostic SMTP en clair dans les logs (hôte, utilisateur, longueur du mot de passe) :
// ça n'a rien à faire hors d'un environnement de debug local.

const transporter = nodemailer.createTransport({
  host: (process.env.SMTP_HOST || "smtp.gmail.com").trim(),
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE || "").trim() === "true",
  auth: { user: smtpUser, pass: smtpPass },
});

if (process.env.SMTP_HOST && smtpUser && smtpPass) {
  transporter.verify((error) => {
    if (error) console.error("Erreur de connexion SMTP :", error.message);
    else console.info("Connexion SMTP OK, prêt à envoyer des emails.");
  });
}

function generatePin() {
  return String(randomInt(100000, 1000000));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtmlEmail({ name, message, pin }: { name?: string; message: string; pin?: string }) {
  const safeName = escapeHtml(name || "un visiteur");
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br/>");
  const pinSection = pin
    ? `<p>Code de confirmation :</p><div class="pin">${pin}</div><p>Ce code expire dans 5 minutes et ne peut être utilisé qu'une seule fois.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#f4f4f7;padding:20px}.card{max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.08)}h1{color:#2c3e50;font-size:20px}p{color:#444;line-height:1.5}.pin{display:inline-block;margin:16px 0;padding:12px 24px;font-size:28px;letter-spacing:6px;font-weight:bold;color:#fff;background:#2c3e50;border-radius:6px}.footer{margin-top:20px;font-size:12px;color:#999;text-align:center}
</style></head><body><div class="card"><h1>Nouveau message de ${safeName}</h1><p>${safeMessage}</p>${pinSection}</div><div class="footer">Envoyé automatiquement depuis le site web</div></body></html>`;
}

export const handleSendEmail: RequestHandler = async (req, res) => {
  const { destinataire, sujet, nom, message, attachments, includePin = true } = req.body ?? {};
  if (typeof destinataire !== "string" || !destinataire.trim() || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ ok: false, error: "destinataire et message sont requis." });
  }

  const email = destinataire.trim().toLowerCase();
  const configuredSupabaseUrl = process.env.SUPABASE_URL;
  const attachmentList = Array.isArray(attachments) ? attachments : [];
  const allowedAttachmentOrigin = configuredSupabaseUrl ? new URL(configuredSupabaseUrl).origin : "";
  const safeAttachments = attachmentList.filter(
    (attachment): attachment is { filename: string; url: string } => {
      if (!attachment || typeof attachment.filename !== "string" || typeof attachment.url !== "string") return false;
      try {
        return new URL(attachment.url).origin === allowedAttachmentOrigin;
      } catch {
        return false;
      }
    },
  );
  const pin = includePin ? generatePin() : undefined;
  if (pin) {
    const supabase = getSupabaseAdminClient();
    const { error: insertError } = await supabase.from("pins").insert({ email, pin, used: false });
    if (insertError) {
      console.error("Erreur de stockage du PIN :", insertError);
      return res.status(500).json({ ok: false, error: "Impossible de stocker le PIN." });
    }
  }

  try {
    const info = await transporter.sendMail({
      from: `"${escapeHtml(nom || "Site Web")}" <${smtpUser}>`,
      to: email,
      subject: typeof sujet === "string" && sujet.trim() ? sujet.trim() : "Nouveau message depuis le site",
      html: buildHtmlEmail({ name: nom, message, pin }),
      attachments: safeAttachments.map(({ filename, url }) => ({ filename, path: url })),
    });
    return res.json({ ok: true, id: info.messageId });
  } catch (error) {
    console.error("Erreur d'envoi email :", error);
    return res.status(500).json({ ok: false, error: "Échec de l'envoi de l'email." });
  }
};

export const handleVerifyPin: RequestHandler = async (req, res) => {
  const { destinataire, pin } = req.body ?? {};
  if (typeof destinataire !== "string" || !destinataire.trim() || pin === undefined || pin === null || String(pin).trim() === "") {
    return res.status(400).json({ ok: false, error: "destinataire et pin sont requis." });
  }

  const email = destinataire.trim().toLowerCase();
  const supabase = getSupabaseAdminClient();
  const { data: entry, error: selectError } = await supabase
    .from("pins")
    .select("id, pin, generated_at, used")
    .eq("email", email)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error("Erreur de lecture du PIN :", selectError);
    return res.status(500).json({ ok: false, error: "Impossible de vérifier le PIN." });
  }
  if (!entry) return res.status(400).json({ ok: false, error: "PIN introuvable." });
  if (entry.used) return res.status(400).json({ ok: false, error: "Ce PIN a déjà été utilisé." });
  if (new Date(entry.generated_at).getTime() + PIN_TTL_MS <= Date.now()) {
    return res.status(400).json({ ok: false, error: "Ce PIN a expiré." });
  }
  if (entry.pin !== String(pin).trim()) return res.status(400).json({ ok: false, error: "PIN incorrect." });

  const { data: consumed, error: updateError } = await supabase
    .from("pins")
    .update({ used: true })
    .eq("id", entry.id)
    .eq("used", false)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Erreur de consommation du PIN :", updateError);
    return res.status(500).json({ ok: false, error: "Impossible de confirmer le PIN." });
  }
  if (!consumed) return res.status(400).json({ ok: false, error: "Ce PIN a déjà été utilisé." });
  return res.json({ ok: true, message: "Confirmation réussie." });
};
