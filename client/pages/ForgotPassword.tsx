import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { apiUrl } from "@/lib/api-config";

type ResetPhase = "identity" | "pin" | "password";

export default function ForgotPassword() {
  const [phase, setPhase] = useState<ResetPhase>("identity");
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", generatedId: "", uuid: "" });
  const [pin, setPin] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateIdentity = (field: keyof typeof identity, value: string) => {
    setIdentity((current) => ({ ...current, [field]: value }));
  };

  const requestPin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/request-password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: identity.firstName,
          last_name: identity.lastName,
          generated_id: identity.generatedId,
          uuid: identity.uuid,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Impossible d’envoyer le code.");
      if (typeof result.email !== "string" || !result.email.includes("@")) {
        throw new Error("Le serveur n’a pas renvoyé l’adresse de récupération. Veuillez redéployer les fonctions Netlify.");
      }
      setEmailMasked(result.email);
      setPhase("pin");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Impossible d’envoyer le code.");
    } finally {
      setLoading(false);
    }
  };

  const confirmPin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: identity.firstName,
          last_name: identity.lastName,
          generated_id: identity.generatedId,
          uuid: identity.uuid,
          pin,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Code PIN invalide.");
      setPhase("password");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Code PIN invalide.");
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (newPassword !== confirmPassword) return setError("Les mots de passe ne correspondent pas.");
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: identity.firstName,
          last_name: identity.lastName,
          generated_id: identity.generatedId,
          uuid: identity.uuid,
          pin,
          newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Impossible de modifier le mot de passe.");
      setPhase("identity");
      setIdentity({ firstName: "", lastName: "", generatedId: "", uuid: "" });
      setPin("");
      setNewPassword("");
      setConfirmPassword("");
      setEmailMasked("");
      setError("Mot de passe mis à jour. Vous pouvez maintenant vous connecter.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Impossible de modifier le mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6" dir="rtl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">استعادة كلمة المرور</h1>
          <p className="text-gray-600">
            {phase === "identity" && "أدخل معلومات العضو للتحقق من هويتك"}
            {phase === "pin" && `تم إرسال الرمز إلى ${emailMasked}`}
            {phase === "password" && "أدخل كلمة المرور الجديدة"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border-r-4 border-red-600 p-8">
          {phase === "identity" && (
            <form onSubmit={requestPin} className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">الاسم الشخصي<input type="text" value={identity.firstName} onChange={(e) => updateIdentity("firstName", e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label>
              <label className="block text-sm font-bold text-gray-700">الاسم العائلي<input type="text" value={identity.lastName} onChange={(e) => updateIdentity("lastName", e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label>
              <label className="block text-sm font-bold text-gray-700">المعرف (ID)<input type="text" value={identity.generatedId} onChange={(e) => updateIdentity("generatedId", e.target.value)} required dir="ltr" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label>
              <label className="block text-sm font-bold text-gray-700">UUID للتأكيد<input type="text" value={identity.uuid} onChange={(e) => updateIdentity("uuid", e.target.value)} required dir="ltr" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label>
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">{loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}</button>
            </form>
          )}

          {phase === "pin" && (
            <form onSubmit={confirmPin} className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">رمز التحقق (6 أرقام)<input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required dir="ltr" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center tracking-[0.5em]" /></label>
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">{loading ? "جاري التحقق..." : "تأكيد الرمز"}</button>
            </form>
          )}

          {phase === "password" && (
            <form onSubmit={updatePassword} className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">كلمة المرور الجديدة<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label>
              <label className="block text-sm font-bold text-gray-700">تأكيد كلمة المرور<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label>
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">{loading ? "جاري التحديث..." : "تحديث كلمة المرور"}</button>
            </form>
          )}

          <div className="text-center mt-4"><Link to="/login" className="text-purple-600 font-bold hover:underline">العودة إلى تسجيل الدخول</Link></div>
        </div>
      </div>
    </Layout>
  );
}
