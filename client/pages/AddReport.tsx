import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, Save } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/api";

const ratingOptions = [
  { value: "سيء", color: "border-red-300 bg-red-50 text-red-700" },
  { value: "مقبول", color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: "جيد", color: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  { value: "جيد جداً", color: "border-lime-300 bg-lime-50 text-lime-700" },
  { value: "ممتاز", color: "border-green-300 bg-green-50 text-green-700" },
];

const ratingFields = [
  { name: "morning_program_rating", label: "تقييم البرنامج الصباحي" },
  { name: "evening_program_rating", label: "تقييم برنامج المساء" },
  { name: "night_program_rating", label: "تقييم البرنامج الليلي" },
  { name: "nutrition_rating", label: "تقييم التغذية" },
  { name: "relationships_rating", label: "تقييم العلاقات بين الأعضاء والقادة" },
] as const;

type RatingFieldName = (typeof ratingFields)[number]["name"];

type Patrol = {
  id: number;
  name: string;
};

type ReportForm = Record<RatingFieldName, string> & {
  patrol_id: string;
  report_date: string;
  general_notes: string;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function RatingField({
  name,
  label,
  value,
  onChange,
}: {
  name: RatingFieldName;
  label: string;
  value: string;
  onChange: (name: RatingFieldName, value: string) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
      <legend className="px-2 text-base font-bold text-gray-800">{label}</legend>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ratingOptions.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 ${
                selected ? `${option.color} ring-2 ring-purple-500 ring-offset-1` : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(name, option.value)}
                className="sr-only"
              />
              {selected && <Check className="h-4 w-4" aria-hidden="true" />}
              {option.value}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function AddReport() {
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [form, setForm] = useState<ReportForm>({
    patrol_id: "",
    report_date: getToday(),
    morning_program_rating: "",
    evening_program_rating: "",
    night_program_rating: "",
    nutrition_rating: "",
    relationships_rating: "",
    general_notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPatrols = async () => {
      try {
        const { data, error: patrolError } = await supabase
          .from("patrols")
          .select("id, name")
          .order("name");

        if (patrolError) {
          console.error("Error loading patrols:", patrolError.message, patrolError.details);
          setError("تعذر تحميل patrouilles. يرجى المحاولة مرة أخرى.");
          return;
        }

        setPatrols(data as Patrol[]);
      } catch (patrolLoadError) {
        console.error(
          "Error loading patrols:",
          patrolLoadError instanceof Error ? patrolLoadError.message : patrolLoadError,
        );
        setError("تعذر الاتصال بالخادم. يرجى التحقق من إعدادات الاتصال والمحاولة مرة أخرى.");
      }
    };

    loadPatrols();
  }, []);

  const updateRating = (name: RatingFieldName, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSaved(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaved(false);

    if (!form.patrol_id) {
      setError("يرجى اختيار patrouille قبل حفظ التقرير.");
      return;
    }

    if (ratingFields.some(({ name }) => !form[name])) {
      setError("يرجى اختيار تقييم لكل برنامج قبل حفظ التقرير.");
      return;
    }

    setLoading(true);
    let insertError: string | null = null;
    try {
      const response = await authenticatedFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          patrol_id: Number(form.patrol_id),
          report_date: form.report_date,
          morning_program_rating: form.morning_program_rating,
          evening_program_rating: form.evening_program_rating,
          night_program_rating: form.night_program_rating,
          nutrition_rating: form.nutrition_rating,
          relationships_rating: form.relationships_rating,
          general_notes: form.general_notes.trim() || null,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        insertError = result?.error || "Failed to save report";
      }
    } catch (err) {
      insertError = err instanceof Error ? err.message : String(err);
    }
    setLoading(false);

    if (insertError) {
      console.error("Error saving daily camp report:", insertError);
      setError("تعذر حفظ التقرير. يرجى المحاولة مرة أخرى.");
      return;
    }

    setSaved(true);
  };

  return (
    <Layout currentPage="reports">
      <div className="mx-auto max-w-4xl pb-12" dir="rtl">
        <header className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-purple-100">
          <div className="h-2 bg-gradient-to-l from-red-600 via-purple-600 to-red-500" />
          <div className="flex items-center justify-between gap-4 px-5 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-purple-700 text-center text-sm font-black leading-tight text-white shadow-lg">
                SHM
              </div>
              <div>
                <p className="text-xs font-bold text-red-600">الكشفية الحسنية المغربية</p>
                <p className="text-sm font-bold text-gray-800">مجموعة الأمل</p>
              </div>
            </div>
            <div className="text-left">
              <div className="inline-flex rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-center">
                <div>
                  <p className="text-xs font-bold text-purple-600">فريق الأمل</p>
                  <p className="font-black text-purple-900">عمر الفاروق</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-5 border-t-2 border-red-500 sm:mx-8" />
          <div className="px-5 pb-7 pt-6 text-center sm:px-8">
            <p className="mb-5 font-serif text-xl text-gray-700">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
            <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
              الكشفية الحسنية المغربية
            </h1>
            <p className="mt-2 text-lg font-bold text-purple-700">فوج عمر الفاروق - مجموعة الأمل</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-red-50 to-purple-50 px-5 py-2 text-lg font-bold text-gray-800">
              <span>تقرير يومي - مخيم الصيف 2026</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-gray-100 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <p className="text-sm font-bold text-purple-600">معلومات التقرير</p>
                <h2 className="mt-1 text-xl font-black text-gray-900">البيانات الأساسية</h2>
              </div>
              <CalendarDays className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">Patrouille</span>
                <select
                  value={form.patrol_id}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, patrol_id: event.target.value }));
                    setError("");
                    setSaved(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  required
                >
                  <option value="">اختر patrouille</option>
                  {patrols.map((patrol) => (
                    <option key={patrol.id} value={patrol.id}>
                      {patrol.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">التاريخ</span>
                <input
                  type="date"
                  value={form.report_date}
                  onChange={(event) => setForm((current) => ({ ...current, report_date: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  required
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-gray-100 sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-bold text-red-600">تقييمات اليوم</p>
              <h2 className="mt-1 text-2xl font-black text-gray-900">كيف كان يومنا في المخيم؟</h2>
              <p className="mt-2 text-sm text-gray-500">اختر مستوى واحداً لكل فقرة.</p>
            </div>
            <div className="space-y-4">
              {ratingFields.map((field) => (
                <RatingField
                  key={field.name}
                  {...field}
                  value={form[field.name]}
                  onChange={updateRating}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-gray-100 sm:p-8">
            <label htmlFor="general_notes" className="block">
              <span className="text-sm font-bold text-purple-600">الملاحظات</span>
              <span className="mt-1 block text-2xl font-black text-gray-900">الملاحظات العامة</span>
            </label>
            <textarea
              id="general_notes"
              value={form.general_notes}
              onChange={(event) => setForm((current) => ({ ...current, general_notes: event.target.value }))}
              rows={6}
              maxLength={2000}
              placeholder="اكتب هنا أهم الملاحظات والاقتراحات المتعلقة بهذا اليوم..."
              className="mt-5 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 leading-8 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
            <p className="mt-2 text-left text-xs text-gray-400">{form.general_notes.length}/2000</p>
          </section>

          {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">{error}</p>}
          {saved && <p className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center font-bold text-green-700">تم حفظ التقرير بنجاح.</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Link
              to="/reports"
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-center font-bold text-gray-600 transition hover:border-purple-300 hover:text-purple-700"
            >
              العودة إلى التقارير
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-red-600 to-purple-700 px-8 py-3 font-black text-white shadow-lg transition hover:from-red-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-5 w-5" aria-hidden="true" />
              {loading ? "جاري الحفظ..." : "حفظ التقرير"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
