import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Send, MessageCircle, Heart, Eye } from "lucide-react";

interface Idea {
  id: string;
  title: string;
  description: string;
  author?: string;
  category?: string;
  likes?: number;
  views?: number;
  createdAt: string;
}

export default function IdeasBox() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load ideas from localStorage (demo)
  useEffect(() => {
    const stored = localStorage.getItem("ideas");
    if (stored) {
      setIdeas(JSON.parse(stored));
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create new idea
      const newIdea: Idea = {
        id: `idea_${Date.now()}`,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        author: "عضو",
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      const updatedIdeas = [newIdea, ...ideas];
      setIdeas(updatedIdeas);
      localStorage.setItem("ideas", JSON.stringify(updatedIdeas));

      // Reset form
      setFormData({ title: "", description: "", category: "" });
      setSubmitted(true);

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Error submitting idea:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50" dir="rtl">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-red-600 to-purple-600 bg-clip-text text-transparent mb-3">
            صندوق الأفكار
          </h1>
          <p className="text-gray-600 text-lg">شارك أفكارك واقتراحاتك معنا</p>
          <p className="text-gray-500 text-sm">Share your ideas and suggestions with us</p>
        </div>

        {/* Submit Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12 border-r-4 border-purple-600">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">أضف فكرتك</h2>

          {submitted && (
            <div className="bg-green-50 border-r-4 border-green-600 p-4 rounded-lg mb-6">
              <p className="text-green-700 font-semibold">✅ تم إرسال فكرتك بنجاح!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                العنوان / Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="عنوان الفكرة..."
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الفئة / Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="">اختر فئة...</option>
                <option value="activities">الأنشطة | Activities</option>
                <option value="training">التدريب | Training</option>
                <option value="event">الفعاليات | Events</option>
                <option value="improvement">تحسينات | Improvements</option>
                <option value="other">أخرى | Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الوصف / Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="اشرح فكرتك بالتفصيل..."
                rows={5}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={20} />
              {loading ? "جاري الإرسال..." : "إرسال الفكرة"}
            </button>
          </form>
        </div>

        {/* Ideas List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">الأفكار الأخيرة</h2>

          {ideas.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">لا توجد أفكار بعد</p>
              <p className="text-gray-500">كن أول من يشارك فكرة!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="bg-white rounded-lg shadow p-6 border-r-4 border-blue-600 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{idea.title}</h3>
                      {idea.category && (
                        <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
                          {idea.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 leading-relaxed">{idea.description}</p>

                  <div className="flex items-center justify-between text-gray-500 text-sm border-t pt-3">
                    <div className="flex gap-6">
                      <div className="flex items-center gap-1">
                        <Eye size={16} />
                        <span>{idea.views || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart size={16} />
                        <span>{idea.likes || 0}</span>
                      </div>
                    </div>
                    <span className="text-xs">
                      {new Date(idea.createdAt).toLocaleDateString("ar-MA")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
