import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleRegister,
  handleLogin,
  handleGetProfile,
  handleSavePdfQrCode,
  handleGetRegistrationOptions,
} from "./routes/auth";
import { handleConfirmPin, handleGetAttendance, handleVerifyQr } from "./routes/attendance";
import {
  handleGetDocuments,
  handleGetSessions,
  handleGetReports,
  handleGetReportById,
  handleCreateIdea,
  handleCreateReport,
} from "./routes/content";
import { requireAuth } from "./middleware/requireAuth";
import { handleSendEmail, handleVerifyPin } from "./routes/email";
import { handleRequestPasswordReset, handleResetPassword } from "./routes/passwordReset";
import { handleUploadMedia, handleListMedia, handleDeleteMedia } from "./routes/gallery";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  // Bumped from 20mb: the gallery feature accepts base64 photos/videos up
  // to 50MB binary, which becomes ~68MB once base64-encoded plus JSON
  // wrapper overhead.
  app.use(express.json({ limit: "80mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // Netlify/serverless-http nous transmet parfois le corps JSON "éclaté"
  // caractère par caractère (objet avec des clés '0','1','2',... au lieu
  // d'un objet parsé). On détecte ce cas et on reconstruit le JSON original.
  // Filet de sécurité pour les routes qui passent encore par ce pont
  // (attendance, membership, save-documents, profile) -- login et register
  // ont maintenant leur propre fonction Netlify native qui ne peut pas
  // subir ce problème (voir netlify/functions/auth-login.ts et
  // auth-register.ts).
  app.use((req, _res, next) => {
    const body = req.body as unknown;
    if (body && typeof body === "object" && !Array.isArray(body) && !Buffer.isBuffer(body)) {
      const keys = Object.keys(body as Record<string, unknown>);
      const isShatteredJson =
        keys.length > 0 &&
        keys.every((k, i) => k === String(i)) &&
        keys.every((k) => typeof (body as Record<string, unknown>)[k] === "string" && (body as Record<string, unknown>)[k].toString().length === 1);

      if (isShatteredJson) {
        const rawJson = keys.map((k) => (body as Record<string, unknown>)[k]).join("");
        try {
          req.body = JSON.parse(rawJson);
        } catch {
          // Laisse req.body tel quel ; la validation de la route signalera le vrai problème.
        }
      }
    }
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.post("/api/send-email", handleSendEmail);
  app.post("/api/verify-pin", handleVerifyPin);

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.get("/api/auth/options", handleGetRegistrationOptions);
  app.post("/api/auth/register", handleRegister);
  app.post("/api/auth/login", handleLogin);
  app.get("/api/auth/profile", handleGetProfile);
  app.post("/api/auth/save-documents", handleSavePdfQrCode);
  app.post("/api/auth/request-password-reset", handleRequestPasswordReset);
  app.post("/api/auth/reset-password", handleResetPassword);

  app.get("/api/attendance", requireAuth, handleGetAttendance);
  app.post("/api/attendance/verify-qr", requireAuth, handleVerifyQr);
  app.post("/api/attendance/confirm-pin", requireAuth, handleConfirmPin);


  // Content routes (bypass Supabase RLS via the admin client -- see
  // server/routes/content.ts for why this is necessary with this app's
  // custom auth system).
  app.get("/api/documents", handleGetDocuments);
  app.get("/api/sessions", handleGetSessions);
  app.get("/api/reports", handleGetReports);
  app.get("/api/reports/:id", handleGetReportById);
  app.post("/api/ideas", requireAuth, handleCreateIdea);
  app.post("/api/reports", requireAuth, handleCreateReport);
  app.get("/api/gallery", requireAuth, handleListMedia);
  app.post("/api/gallery", requireAuth, handleUploadMedia);
  app.delete("/api/gallery/:id", requireAuth, handleDeleteMedia);

  return app;
}
