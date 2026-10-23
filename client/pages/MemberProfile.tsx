import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { fetchMemberById, Member } from "../lib/api";

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMember = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchMemberById(id);
        setMember(data);
      } catch (error) {
        console.error("Error loading member:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMember();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin">
            <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!member) {
    return (
      <Layout>
        <div className="bg-white rounded-lg p-8 text-center shadow-md" dir="rtl">
          <p className="text-gray-500 text-lg">لم يتم العثور على العضو</p>
          <Link
            to="/members"
            className="inline-block mt-4 text-purple-600 font-bold hover:underline"
          >
            العودة إلى قائمة الأعضاء
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Back Button */}
        <Link
          to="/members"
          className="text-purple-600 font-bold hover:underline flex items-center gap-2"
        >
          ← العودة إلى قائمة الأعضاء
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg border-r-4 border-gradient-to-b from-red-600 to-purple-600 overflow-hidden">
          <div className="p-8">
            {/* Profile Photo and Basic Info */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Photo */}
              <div className="flex-shrink-0">
                {member.profile_photo ? (
                  <img
                    src={member.profile_photo}
                    alt={member.full_name}
                    className="w-40 h-40 rounded-lg object-cover shadow-md"
                  />
                ) : (
                  <div className="w-40 h-40 bg-gradient-to-l from-red-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-6xl text-white font-bold">
                      {member.full_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  {member.full_name}
                </h1>

                {member.role && (
                  <p className="text-xl text-red-600 font-semibold mb-4">
                    {member.role}
                  </p>
                )}

                {member.team && (
                  <div className="bg-gradient-to-l from-red-100 to-purple-100 rounded-lg p-4 mb-4">
                    <p className="font-semibold text-gray-800">
                      الفريق: <span className="text-red-600">{member.team}</span>
                    </p>
                  </div>
                )}

                {member.bio && (
                  <p className="text-gray-600 leading-relaxed">{member.bio}</p>
                )}
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                معلومات التواصل
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {member.email && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 font-semibold mb-1">
                      البريد الإلكتروني
                    </p>
                    <a
                      href={`mailto:${member.email}`}
                      className="text-purple-600 font-semibold hover:underline break-all"
                    >
                      {member.email}
                    </a>
                  </div>
                )}

                {member.phone && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 font-semibold mb-1">
                      رقم الهاتف
                    </p>
                    <a
                      href={`tel:${member.phone}`}
                      className="text-purple-600 font-semibold hover:underline"
                    >
                      {member.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            {member.team && (
              <div className="mt-8 bg-blue-50 rounded-lg p-4 border-r-4 border-blue-600">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">عضو منذ:</span>{" "}
                  {new Date(member.created_at).toLocaleDateString("ar-MA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
