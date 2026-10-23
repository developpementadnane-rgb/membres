import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { fetchSessions, Session } from "../lib/api";

interface Program extends Session {
  summary?: string;
}

export default function Program() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const data = await fetchSessions();
        setPrograms(data);
      } catch (error) {
        console.error("Error loading programs:", error);
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    };

    loadPrograms();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-MA", {
      month: "short",
      day: "numeric",
    });
  };

  const isUpcoming = (startDate: string): boolean => {
    return new Date(startDate) > new Date();
  };

  return (
    <Layout currentPage="program">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
          البرنامج
        </h1>
        <p className="text-gray-600">
          الأنشطة والبرامج الكشفية القادمة
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-96">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full"></div>
          </div>
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center border-t-4 border-gray-300">
          <p className="text-gray-500 text-lg">لا توجد جلسات مسجلة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {programs.map((program) => (
            <div
              key={program.id}
              className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-gradient-to-r from-red-600 to-purple-600 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            >
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-purple-200 to-red-200 overflow-hidden">
                {program.image_url ? (
                  <img
                    src={program.image_url}
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    📅
                  </div>
                )}
                {isUpcoming(program.start_date) && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    قادم
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                  {program.title}
                </h3>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {program.summary}
                </p>

                {/* Details */}
                <div className="space-y-2 mb-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{formatDate(program.start_date)}</span>
                    {program.end_date && (
                      <>
                        <span>-</span>
                        <span>{formatDate(program.end_date)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{program.location}</span>
                  </div>
                </div>

                {/* Description Preview */}
                <p className="text-xs text-gray-600 mb-4 line-clamp-2 bg-gray-50 p-2 rounded">
                  {program.description}
                </p>

                {/* CTA Button */}
                <Link
                  to={`#program-${program.id}`}
                  className="w-full inline-block text-center bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-2 rounded-lg transition-all"
                >
                  معرفة المزيد
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
