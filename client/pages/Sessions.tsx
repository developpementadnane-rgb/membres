import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api-config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Session {
  id: string;
  title: string;
  date_time: string;
  location: string;
  target_audience: string;
  objective: string;
  methodology_original: string;
  methodology_reformulated: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await fetch(apiUrl("/api/sessions"));
        const result = await response.json().catch(() => null);

        if (!response.ok || !result) {
          console.error("Error loading sessions");
          setSessions([]);
        } else {
          setSessions(result.sessions || []);
        }
      } catch (error) {
        console.error("Error loading sessions:", error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-MA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50 flex flex-col" dir="rtl">
      <Header />

      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            الجلسات التدريبية
          </h1>
          <p className="text-gray-600">
            إدارة وعرض جميع الجلسات التدريبية للفريق
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto flex-grow">
        {loading ? (
          <div className="flex justify-center items-center min-h-96">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full"></div>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center" style={{ borderRight: "4px solid #dc2626" }}>
            <p className="text-gray-500 text-lg mb-4">لا توجد جلسات مسجلة</p>
            <p className="text-gray-400 text-sm">ستظهر الجلسات الجديدة هنا</p>
          </div>
        ) : (
          <div className="space-y-6 pb-12">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                style={{ borderRight: "4px solid #dc2626" }}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                      {session.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>📅 {formatDate(session.date_time)}</span>
                      <span>📍 {session.location}</span>
                    </div>
                  </div>

                  {/* Target Audience & Objective */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">
                        الجمهور المستهدف
                      </p>
                      <p className="text-gray-700">{session.target_audience}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">
                        الهدف
                      </p>
                      <p className="text-gray-700">{session.objective}</p>
                    </div>
                  </div>

                  {/* Methodology */}
                  <div className="bg-purple-50 p-4 rounded-lg mb-4">
                    <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                      المنهجية
                    </p>
                    {session.methodology_reformulated ? (
                      <>
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-semibold">المحسّنة:</span>{" "}
                          {session.methodology_reformulated}
                        </p>
                        {session.methodology_original && (
                          <p className="text-xs text-gray-500 italic">
                            <span className="font-semibold">الأصلية:</span>{" "}
                            {session.methodology_original}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-700">{session.methodology_original}</p>
                    )}
                  </div>

                  {/* PDF Link */}
                  <div className="flex items-center gap-3">
                    {session.pdf_url && (
                      <a
                        href={session.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold rounded-lg transition-colors"
                      >
                        <span>📄</span> تحميل PDF
                      </a>
                    )}
                  </div>

                  {/* Created Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      تم الإنشاء: {formatDate(session.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
