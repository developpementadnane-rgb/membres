import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Download } from 'lucide-react';
import { apiUrl } from '../lib/api-config';
import { useNetworkStatus } from '@/lib/offline/network';
import Layout from '../components/Layout';

interface Report {
  id: string;
  title: string | null;
  location: string | null;
  time: string | null;
  objective: string | null;
  participants_boys: number | null;
  participants_girls: number | null;
  leaders_count: number | null;
  category: string | null;
  beneficiary: string | null;
  description_reformulated: string | null;
  pdf_url: string | null;
  created_at: string;
}

export default function Reports() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This page needs a live Supabase-backed listing -- there is no
    // local cache for reports (unlike member profile / membership /
    // QR code, which are explicitly meant to work offline). Fail
    // clearly instead of trying and getting a confusing network error.
    if (!isOnline) {
      setError("Les rapports nécessitent une connexion internet.");
      setIsLoading(false);
      return;
    }

    const fetchReports = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(apiUrl('/api/reports'));
        const result = await response.json().catch(() => null);

        if (!response.ok || !result) {
          setError(result?.error || 'Erreur lors du chargement des rapports');
          return;
        }

        setReports(result.reports || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [isOnline]);

  const filteredReports = reports.filter(
    (report) =>
      (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.objective || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Layout currentPage="reports">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
          التقارير المسجلة
        </h1>
        <p className="text-gray-600">{filteredReports.length} تقرير في المجموع</p>
      </div>

      {isOnline && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="البحث بالعنوان أو الموقع أو الفئة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="ml-2 text-gray-600">جاري تحميل التقارير...</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4 pb-20">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-r-4 border-purple-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {report.title || report.objective || 'تقرير بدون عنوان'}
                    </h3>
                  </div>
                  <time className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {formatDate(report.created_at)}
                  </time>
                </div>

                <div className="flex gap-4 mb-4 text-sm text-gray-600 flex-wrap">
                  {report.location && (
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      📍 {report.location}
                    </span>
                  )}
                  {report.category && (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      🏕️ {report.category}
                    </span>
                  )}
                  {(report.participants_boys || report.participants_girls) && (
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                      👥 {(report.participants_boys || 0) + (report.participants_girls || 0)} مشارك
                    </span>
                  )}
                  {report.leaders_count && (
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                      👔 {report.leaders_count} قادة
                    </span>
                  )}
                </div>

                {report.description_reformulated && (
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {report.description_reformulated}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => navigate(`/reports/${report.id}`)}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Eye size={18} />
                    <span>عرض التفاصيل</span>
                  </button>
                  {report.pdf_url && (
                    <a
                      href={report.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="تحميل PDF"
                    >
                      <Download size={18} />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md px-6 py-12 text-center">
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'لم يتم العثور على تقارير تطابق البحث' : 'لا توجد تقارير مسجلة'}
              </p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
