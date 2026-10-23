import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { apiUrl } from "@/lib/api-config";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!token) return setError("الرابط غير صالح.");
    if (newPassword.length < 6) return setError("كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل.");
    if (newPassword !== confirmPassword) return setError("كلمتا المرور غير متطابقتين.");
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/reset-password"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erreur");
      setSuccess(true); setTimeout(() => navigate("/login"), 2500);
    } catch (err) { setError(err instanceof Error ? err.message : "حدث خطأ. حاول مجددا."); } finally { setLoading(false); }
  };
  return <Layout><div className="max-w-md mx-auto space-y-6" dir="rtl"><div className="text-center mb-8"><h1 className="text-3xl font-bold text-gray-800 mb-2">إعادة تعيين كلمة المرور</h1></div>{!success ? <div className="bg-white rounded-lg shadow-lg border-r-4 border-gradient-to-b from-red-600 to-purple-600 p-8">{!token ? <p className="text-red-600 text-center font-bold">الرابط غير صالح أو منتهي الصلاحية.</p> : <form onSubmit={handleSubmit} className="space-y-4"><label className="block text-sm font-bold text-gray-700">كلمة المرور الجديدة<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label><label className="block text-sm font-bold text-gray-700">تأكيد كلمة المرور<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></label>{error && <p className="text-red-600 text-sm text-center">{error}</p>}<button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">{loading ? "جاري التحديث..." : "تحديث كلمة المرور"}</button></form>}</div> : <div className="bg-white rounded-lg shadow-lg border-r-4 border-green-600 p-8 text-center space-y-4"><div className="text-5xl">✓</div><h2 className="text-2xl font-bold text-gray-800">تم تحديث كلمة المرور بنجاح</h2><p className="text-gray-600">سيتم تحويلك إلى صفحة تسجيل الدخول...</p><Link to="/login" className="text-purple-600 font-bold hover:underline">تسجيل الدخول الآن</Link></div>}</div></Layout>;
}
