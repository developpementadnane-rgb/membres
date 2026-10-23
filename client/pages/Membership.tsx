import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api-config";

type Status = "both" | "payment_only" | "documents_only" | "none";

function computeStatus(paymentCompleted: boolean, documentsCompleted: boolean): Status {
  if (paymentCompleted && documentsCompleted) return "both";
  if (paymentCompleted) return "payment_only";
  if (documentsCompleted) return "documents_only";
  return "none";
}

const STATUS_LABELS: Record<Status, { title: string; tone: string }> = {
  both: { title: "العضوية مكتملة لهذا الموسم", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  payment_only: { title: "تم أداء الواجب، الوثائق لم تكتمل بعد", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  documents_only: { title: "تم تقديم الوثائق، الواجب لم يُؤدَّ بعد", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  none: { title: "لم يتم بدء ملف الانخراط بعد", tone: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function Membership() {
  const { user } = useAuth();
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [documentsCompleted, setDocumentsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;


    const load = async () => {
      const generatedId = user?.generated_id;
      if (!user?.id && !generatedId) {
        setError("Utilisateur non authentifié");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(apiUrl(`/api/auth/profile?generated_id=${encodeURIComponent(generatedId!)}`));
        const data = await response.json().catch(() => null);

        if (!response.ok || !data) {
          setError("Impossible de charger les données");
          return;
        }

        if (cancelled) return;
        setPaymentCompleted(!!data.payment_completed);
        setDocumentsCompleted(!!data.documents_completed);
      } catch (err) {
        setError("Erreur lors du chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const status = computeStatus(paymentCompleted, documentsCompleted);
  const statusInfo = STATUS_LABELS[status];

  return (
    <Layout currentPage="membership">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
          حالة الانخراط
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-64">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 font-bold">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={`rounded-lg border p-6 text-center ${statusInfo.tone}`}>
            <p className="text-lg font-bold">{statusInfo.title}</p>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm font-semibold">
              <span>{paymentCompleted ? "✅ تم أداء الواجب" : "❌ الواجب لم يُؤدَّ بعد"}</span>
              <span>{documentsCompleted ? "✅ الوثائق مكتملة" : "❌ الوثائق غير مكتملة"}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-purple-600">
            <h2 className="text-lg font-bold text-gray-800 mb-3">معلومات مهمة</h2>
            <p className="text-gray-700 leading-7">
              لتحديث حالة الانخراط الخاصة بك (أداء الواجب أو تقديم الوثائق)، يرجى التواصل مع المؤطر
              المسؤول عن فريقك.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}
