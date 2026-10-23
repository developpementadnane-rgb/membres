import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { hasPendingSyncItems } from "@/lib/offline/syncEngine";
import {
  Menu,
  User,
  LogOut,
  Home,
  FileText,
  Users,
  ClipboardCheck,
  DatabaseZap,
  IdCard,
  Images,
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { label: "الرئيسية", icon: Home, path: "/dashboard", color: "text-blue-600" },
    { label: "ملفي الشخصي", icon: User, path: "/my-profile", color: "text-green-600" },
    { label: "العضوية", icon: IdCard, path: "/membership", color: "text-pink-600" },
    { label: "التقارير", icon: FileText, path: "/reports", color: "text-red-600" },
    { label: "حصص", icon: Users, path: "/sessions", color: "text-purple-600" },
    { label: "الحضور", icon: ClipboardCheck, path: "/attendance", color: "text-emerald-600" },
    { label: "المعرض", icon: Images, path: "/gallery", color: "text-orange-600" },
    { label: "مساحة التخزين", icon: DatabaseZap, path: "/sync-cache", color: "text-slate-600" },
    { label: "صناديق الأفكار", icon: FileText, path: "/ideas", color: "text-yellow-600" },
  ];

  return (
    <>
      <aside
        dir="rtl"
        className={`fixed right-0 top-0 h-screen w-64 bg-white border-r-4 border-scout-purple shadow-lg transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center justify-center border-b border-gray-200 bg-gradient-to-b from-scout-purple to-purple-600">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F1f75f54747b54e29825eb23fdf70cfc1%2Fa8caeb8f3ae14cfe9ddb9534cad38297?format=webp&width=800&height=1200"
            alt="شعار الكشفية الحسنية"
            className="w-12 h-12 object-contain"
          />
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active ? "bg-scout-purple text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <IconComponent size={24} className={active ? "text-white" : item.color} />
                    <span className="font-semibold">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={async () => {
              const pending = await hasPendingSyncItems();
              if (
                pending &&
                !window.confirm(
                  "توجد بيانات لم تتم مزامنتها بعد (حضور أو وثائق). ستبقى محفوظة على هذا الجهاز وسيتم إرسالها تلقائيًا عند تسجيل الدخول مجددًا بنفس الحساب مع اتصال بالإنترنت.\n\nهل تريد تسجيل الخروج الآن رغم ذلك؟",
                )
              ) return;
              await logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={24} className="text-red-600" />
            <span className="font-semibold">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={isOpen}
        title={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
        onClick={() => setIsOpen((open) => !open)}
        className={`fixed top-4 z-[60] h-10 w-10 rounded-lg bg-scout-purple text-white shadow-lg transition-[right] duration-300 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 flex items-center justify-center ${
          isOpen ? "right-64" : "right-4"
        }`}
      >
        <Menu size={22} />
      </button>

      {isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsOpen(false)} />}
      <div className={`hidden lg:block transition-all duration-300 ${isOpen ? "w-64" : "w-0"}`} />
    </>
  );
}
