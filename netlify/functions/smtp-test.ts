// FONCTION DE DIAGNOSTIC TEMPORAIRE - à supprimer une fois le problème résolu.
// Ouvrir : https://VOTRE-SITE.netlify.app/.netlify/functions/smtp-test
// Ne révèle jamais la clé : seulement sa longueur et une empreinte de 6 caractères.
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

const clean = (v?: string) => (v ?? "").replace(/[^\x21-\x7E]/g, "");
const fingerprint = (v: string) => createHash("sha256").update(v).digest("hex").slice(0, 6);

async function attempt(port: number, secure: boolean, user: string, pass: string) {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
  try {
    await transport.verify();
    return { port, secure, ok: true };
  } catch (e: any) {
    return {
      port,
      secure,
      ok: false,
      code: e?.code,
      responseCode: e?.responseCode,
      response: String(e?.response || e?.message || "").slice(0, 200),
    };
  }
}

export const handler = async () => {
  const rawUser = process.env.SMTP_USER ?? "";
  const rawPass = process.env.SMTP_PASS ?? "";
  const user = clean(rawUser);
  const pass = clean(rawPass);

  const report = {
    netlifyContext: process.env.CONTEXT,
    node: process.version,
    variablesDefinies: {
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: !!rawUser,
      SMTP_PASS: !!rawPass,
    },
    user: { valeur: user, longueurBrute: rawUser.length, longueurNettoyee: user.length },
    pass: {
      longueurBrute: rawPass.length,
      longueurNettoyee: pass.length,
      caracteresInvisiblesOuEspaces: rawPass !== pass,
      empreinte6: fingerprint(pass),
    },
    tests: [await attempt(465, true, user, pass), await attempt(587, false, user, pass)],
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(report, null, 2),
  };
};
