import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api-config";

interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(apiUrl("/api/documents"));
        const result = await response.json().catch(() => null);

        if (!response.ok || !result) {
          console.error("Erreur lors du chargement des documents");
          setError("Impossible de charger les documents.");
          return;
        }

        setDocuments(result.documents ?? []);
      } catch (err) {
        // Includes offline: fetch() rejects rather than resolving with
        // a bad response, so this page has no cache to fall back to
        // (documents/announcements are explicitly an online-only
        // feature, unlike profile/membership/QR).
        console.error("Erreur réseau:", err);
        setError("يتطلب الاتصال بالإنترنت لعرض الوثائق.");
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, []);

  return (
    <Layout currentPage="dashboard">
      <div className="space-y-8">

        {/* En-tête */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-scout-purple mb-3">
            الرئيسية
          </h2>

          <p className="text-gray-600">
            جميع الوثائق والإعلانات المهمة للأعضاء
          </p>
        </div>

        {/* Chargement */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>جاري تحميل الوثائق...</p>
          </div>
        )}

        {/* Erreur */}
        {!loading && error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Aucun document */}
        {!loading && !error && documents.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center shadow-sm">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-400" />

            <h3 className="font-semibold text-gray-700 mb-2">
              لا توجد وثائق حاليا
            </h3>

            <p className="text-sm text-gray-500">
              ستظهر هنا الوثائق المتاحة للأعضاء.
            </p>
          </div>
        )}

        {/* Liste des documents */}
        {!loading && !error && documents.length > 0 && (
          <div className="space-y-4">
            {documents.map((document) => (
              <article
                key={document.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-5">

                  {/* Icône */}
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-scout-purple/10 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-scout-purple" />
                  </div>

                  {/* Informations */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {document.title}
                    </h3>

                    {document.description && (
                      <p className="text-gray-600 text-sm leading-6">
                        {document.description}
                      </p>
                    )}
                  </div>

                  {/* Téléchargement */}
                  {document.file_url && (
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-scout-purple px-5 py-3 text-white font-medium hover:opacity-90 transition-opacity shrink-0"
                    >
                      <Download className="w-5 h-5" />
                      <span>تحميل الوثيقة</span>
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
