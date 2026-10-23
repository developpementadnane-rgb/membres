import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, AlertCircle, ExternalLink } from 'lucide-react';
import { apiUrl } from '../lib/api-config';
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
  description_original: string | null;
  description_reformulated: string | null;
  evaluation_positive: string | null;
  evaluation_negative: string | null;
  recommendations: string | null;
  pdf_url: string | null;
  created_at: string;
}

const fields: { key: keyof Report; label: string }[] = [
  { key: 'location', label: 'الموقع' },
  { key: 'time', label: 'الوقت' },
  { key: 'category', label: 'الفئة' },
  { key: 'beneficiary', label: 'المستفيدون' },
  { key: 'participants_boys', label: 'عدد الذكور المشاركين' },
  { key: 'participants_girls', label: 'عدد الإناث المشاركات' },
  { key: 'leaders_count', label: 'عدد القادة' },
  { key: 'evaluation_positive', label: 'التقييم الإيجابي' },
  { key: 'evaluation_negative', label: 'نقاط التحسين' },
  { key: 'recommendations', label: 'التوصيات' },
];

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(apiUrl(`/api/reports/${id}`));
        const result = await response.json().catch(() => null);

        if (!response.ok || !result) {
          setError(result?.error || 'التقرير غير موجود');
          return;
        }

        setReport(result.report);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'خطأ غير معروف');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatValue = (value: Report[keyof Report]) =>
    value === null || value === '' || value === 0 ? null : String(value);

  return (
    <Layout currentPage="reports">
      <button
        onClick={() => navigate('/reports')}
        className="mb-6 flex items-center gap-2 text-purple-600 hover:text-red-600 transition-colors font-semibold"
      >
        <ArrowLeft size={20} />
        العودة إلى التقارير
      </button>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="ml-2 text-gray-600">جاري تحميل التقرير...</p>
        </div>
      )}

      {!isLoading && !error && !report && (
        <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
          <div className="flex gap-4 items-start">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">التقرير غير موجود</h2>
              <p className="text-gray-600">لا توجد معلومات متاحة لهذا المعرف.</p>
            </div>
          </div>
        </div>
      )}

      {report && (
        <article className="bg-white rounded-lg shadow-md p-8 border-r-4 border-purple-600 pb-20">
          <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {report.title || report.objective || 'تقرير بدون عنوان'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">تم الإنشاء: {formatDate(report.created_at)}</p>
            </div>

            {report.pdf_url && (
              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={report.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <ExternalLink size={18} />
                  فتح PDF
                </a>
                <a
                  href={report.pdf_url}
                  download
                  className="flex items-center gap-2 bg-gradient-to-l from-red-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg transition-all"
                >
                  <Download size={18} />
                  تحميل
                </a>
              </div>
            )}
          </div>

          {(report.description_reformulated || report.description_original) && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">وصف النشاط</h2>
              <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-line text-gray-700">
                {report.description_reformulated || report.description_original}
              </div>
            </section>
          )}

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">المعلومات التفصيلية</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fields.map((field) => {
                const value = formatValue(report[field.key]);
                if (!value) return null;
                return (
                  <div key={field.key}>
                    <dt className="text-sm font-medium text-gray-500 mb-1">{field.label}</dt>
                    <dd className="text-gray-900 whitespace-pre-line break-words">{value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>

          {!report.pdf_url && (
            <p className="mt-8 p-4 bg-gray-50 rounded-lg text-gray-500 text-center">
              لا يوجد ملف PDF متاح لهذا التقرير.
            </p>
          )}
        </article>
      )}
    </Layout>
  );
}
