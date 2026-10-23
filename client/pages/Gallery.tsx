import { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { ImagePlus, Loader2, Trash2, Video as VideoIcon } from "lucide-react";

interface MediaItem {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  description: string | null;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 Mo, doit correspondre à server/routes/gallery.ts

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("ar-MA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function groupByDay(items: MediaItem[]): { day: string; items: MediaItem[] }[] {
  const groups = new Map<string, MediaItem[]>();
  for (const item of items) {
    const key = new Date(item.created_at).toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({ day: dayLabel(items[0].created_at), items }));
}

export default function Gallery() {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/gallery");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMedia(data.media || []);
    } catch {
      setError("تعذر تحميل المعرض. تحقق من اتصالك بالإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("الملف كبير جدًا (الحد الأقصى 50 ميغابايت).");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError("");
    try {
      const mediaDataUrl = await fileToDataUrl(file);
      const response = await authenticatedFetch("/api/gallery", {
        method: "POST",
        body: JSON.stringify({ mediaDataUrl, description: description.trim() || null }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "فشل الإرسال");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إرسال الملف");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("حذف هذا المنشور نهائيًا؟")) return;
    try {
      const response = await authenticatedFetch(`/api/gallery/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError("تعذر حذف هذا المنشور.");
    }
  };

  const groups = groupByDay(media);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-scout-brown mb-6">المعرض المشترك</h1>

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="أضف وصفًا (اختياري)..."
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-scout-brown"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id="gallery-file-input"
        />
        <label
          htmlFor="gallery-file-input"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white cursor-pointer ${uploading ? "bg-gray-400" : "bg-scout-brown hover:opacity-90"}`}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {uploading ? "جارٍ الإرسال..." : "إضافة صورة أو فيديو"}
        </label>
        <p className="text-xs text-gray-400 mt-2">الصيغ المقبولة: JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM — 50 ميغابايت كحد أقصى</p>
      </div>

      {error && <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 size={20} className="animate-spin ml-2" /> جارٍ التحميل...
        </div>
      )}

      {!loading && groups.length === 0 && !error && (
        <p className="text-center text-gray-400 py-12">لا توجد منشورات بعد. كن أول من يشارك!</p>
      )}

      {groups.map((group) => (
        <section key={group.day} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-3 sticky top-0 bg-scout-cream py-1">{group.day}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {group.items.map((item) => (
              <div key={item.id} className="relative group rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                {item.media_type === "video" ? (
                  <video src={item.media_url} controls className="w-full h-36 object-cover bg-black" />
                ) : (
                  <img src={item.media_url} alt={item.description || ""} className="w-full h-36 object-cover" loading="lazy" />
                )}
                <div className="p-2">
                  {item.description && <p className="text-xs text-gray-700 line-clamp-2">{item.description}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {[item.first_name, item.last_name].filter(Boolean).join(" ") || "عضو"}
                  </p>
                </div>
                {item.user_id === user?.id && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="حذف"
                    className="absolute top-1.5 left-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {item.media_type === "video" && (
                  <span className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1">
                    <VideoIcon size={12} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </Layout>
  );
}
