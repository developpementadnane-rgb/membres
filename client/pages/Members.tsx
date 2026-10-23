import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { fetchMembers, Member } from "../lib/api";

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const data = await fetchMembers();
        setMembers(data);

        // Extract unique teams
        const uniqueTeams = [...new Set(data.map((m) => m.team).filter(Boolean))];
        setTeams(uniqueTeams as string[]);
      } catch (error) {
        console.error("Error loading members:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  // Filter members based on search and team selection
  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTeam = !selectedTeam || member.team === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            دليل الأعضاء
          </h1>
          <p className="text-gray-600">
            استعرض قائمة جميع أعضاء الكشفية الحسنية
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-gradient-to-b from-red-600 to-purple-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                بحث بالاسم
              </label>
              <input
                type="text"
                placeholder="ابحث عن عضو..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الفريق
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
              >
                <option value="">جميع الفريقات</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <p className="text-sm text-gray-500 mt-4">
            عدد النتائج: {filteredMembers.length} من {members.length} عضو
          </p>
        </div>

        {/* Members Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin">
              <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full"></div>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center shadow-md">
            <p className="text-gray-500 text-lg">لا توجد أعضاء</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <Link key={member.id} to={`/member/${member.id}`}>
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-t-4 border-gradient-to-r from-red-600 to-purple-600 overflow-hidden cursor-pointer h-full">
                  <div className="p-6">
                    {/* Profile Photo */}
                    {member.profile_photo ? (
                      <div className="mb-4">
                        <img
                          src={member.profile_photo}
                          alt={member.full_name}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="mb-4 w-full h-40 bg-gradient-to-l from-red-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-4xl text-white font-bold">
                          {member.full_name.charAt(0)}
                        </span>
                      </div>
                    )}

                    {/* Member Info */}
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {member.full_name}
                    </h3>

                    {member.role && (
                      <p className="text-sm text-red-600 font-semibold mb-3">
                        {member.role}
                      </p>
                    )}

                    {/* Member Details */}
                    <div className="space-y-2 text-sm text-gray-600">
                      {member.team && (
                        <p>
                          <span className="font-semibold">الفريق:</span> {member.team}
                        </p>
                      )}

                      {member.phone && (
                        <p>
                          <span className="font-semibold">الهاتف:</span>{" "}
                          <a
                            href={`tel:${member.phone}`}
                            className="text-purple-600 hover:underline"
                          >
                            {member.phone}
                          </a>
                        </p>
                      )}

                      {member.email && (
                        <p>
                          <span className="font-semibold">البريد:</span>{" "}
                          <a
                            href={`mailto:${member.email}`}
                            className="text-purple-600 hover:underline break-all"
                          >
                            {member.email}
                          </a>
                        </p>
                      )}
                    </div>

                    {/* View Profile Button */}
                    <button className="w-full mt-4 bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:shadow-md transition-shadow text-sm">
                      عرض الملف الشخصي
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
