import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "@/components/Header";
import PasswordInput from "@/components/PasswordInput";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api-config";

export default function Login() {
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    generated_id: "",
    uuid: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.first_name || !formData.last_name || (!formData.generated_id && !formData.uuid) || !formData.password) {
      setError("الرجاء ملء الاسم واللقب ورقم العضو أو UUID وكلمة المرور");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          generated_id: formData.generated_id,
          uuid: formData.uuid,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }

      const userData = await response.json();

      // Update auth context with user data
      setAuthUser(userData);

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("حدث خطأ في الاتصال. حاول مجددا");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-scout-cream" dir="rtl">
      <Header />
      <div className="flex items-center justify-center px-4 py-8 md:py-16 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">
          {/* Login Section */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-scout-purple mb-2">
              تسجيل الدخول
            </h1>
            <p className="text-gray-600">
              الوصول إلى بوابة الكشفية الحسنية
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    الاسم الأول
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="أدخل اسمك الأول"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-scout-purple"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    النسب / اللقب
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="أدخل لقبك"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-scout-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  رقم العضو
                </label>
                <input
                  type="text"
                  name="generated_id"
                  value={formData.generated_id}
                  onChange={handleChange}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder="مثال: E0001 (ذكر) أو F0001 (أنثى)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-scout-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  UUID (اختياري إذا استعملت رقم العضو)
                </label>
                <input
                  type="text"
                  name="uuid"
                  value={formData.uuid}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="UUID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-scout-purple"
                />
              </div>

              <PasswordInput
                name="password"
                value={formData.password}
                onChange={handleChange}
                label="كلمة المرور"
                placeholder="أدخل كلمة المرور"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-scout-purple hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {loading ? "جاري التحقق..." : "تسجيل الدخول"}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-center text-gray-600 mb-4">
                هل نسيت كلمة المرور؟
              </p>
              <Link
                to="/forgot-password"
                className="block text-center text-scout-purple font-bold hover:text-purple-700 transition-colors mb-6"
              >
                إعادة تعيين كلمة المرور
              </Link>

              <p className="text-center text-gray-600 mb-2">
                ليس لديك حساب؟
              </p>
              <Link
                to="/register"
                className="block text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                إنشاء حساب
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
