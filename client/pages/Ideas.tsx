import { useState } from "react";
import { authenticatedFetch } from "@/lib/api";
import Layout from "@/components/Layout";

export default function Ideas() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    requirements: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "عنوان الفكرة مطلوب";
    }
    if (!formData.description.trim()) {
      newErrors.description = "شرح الفكرة مطلوب";
    }
    if (formData.description.trim().length < 20) {
      newErrors.description = "الشرح يجب أن يكون أطول (20 حرف على الأقل)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authenticatedFetch("/api/ideas", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          budget_estimate: formData.budget ? Number(formData.budget) : null,
          requirements: formData.requirements.trim() || null,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to submit idea");
      }

      setSubmitted(true);
      setTimeout(() => {
        setFormData({ title: "", description: "", budget: "", requirements: "" });
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting idea:", error);
      setErrors({ submit: "حدث خطأ أثناء الإرسال. حاول لاحقاً." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout currentPage="ideas">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
          صندوق الأفكار
        </h1>
        <p className="text-gray-600">
          شارك أفكارك المبتكرة بشكل مجهول وساهم في تطوير الأنشطة الكشفية
        </p>
      </div>

      {submitted ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border-2 border-green-400 rounded-lg p-8 text-center animate-pulse">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              تم استقبال فكرتك!
            </h2>
            <p className="text-green-600">
              شكراً لك على مساهمتك. ستتم مراجعة فكرتك من قبل إدارة الكشفية
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-8">
            <div className="flex gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-bold text-blue-900 mb-1">مجهول وآمن تماماً</p>
                <p className="text-sm text-blue-800">
                  لن يتم جمع أي بيانات شخصية منك. أفكارك محمية وسيتم فحصها بسرية تامة.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 border-t-4 border-gradient-to-r from-red-600 to-purple-600">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  عنوان الفكرة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="اكتب عنوان فكرتك بشكل واضح وموجز"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all ${
                    errors.title ? "border-red-500" : "border-gray-300"
                  }`}
                  maxLength={100}
                />
                <div className="flex items-center justify-between mt-2">
                  <div>
                    {errors.title && (
                      <p className="text-red-500 text-sm">{errors.title}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{formData.title.length}/100</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  شرح الفكرة <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="صف فكرتك بالتفصيل. كيف ستساهم في تطوير الأنشطة الكشفية؟"
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                  maxLength={1000}
                />
                <div className="flex items-center justify-between mt-2">
                  <div>
                    {errors.description && (
                      <p className="text-red-500 text-sm">{errors.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{formData.description.length}/1000</p>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اقتراح الميزانية (درهم) <span className="text-gray-400">(اختياري)</span>
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="كم ميزانية تقدّر أن تحتاج فكرتك؟"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  الاحتياجات والموارد <span className="text-gray-400">(اختياري)</span>
                </label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder="ما الموارد والاحتياجات اللازمة لتنفيذ فكرتك؟"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-2">{formData.requirements.length}/500</p>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    إرسال الفكرة
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-8 bg-purple-50 rounded-lg p-6 border-r-4 border-purple-600">
            <h3 className="font-bold text-purple-700 mb-3">💡 نصائح لفكرة أفضل:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>✓</span>
                <span>كن واضحاً في شرح فكرتك وفوائدها</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>ركز على قيمة الفكرة للمجتمع الكشفي</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>اذكر الموارد اللازمة والتحديات المتوقعة</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>تأكد من أن الفكرة قابلة للتنفيذ</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </Layout>
  );
}
