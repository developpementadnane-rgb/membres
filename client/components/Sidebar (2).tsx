import { Link } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";

export default function Sidebar() {
  const { isOpen, closeSidebar } = useSidebar();

  const menuItems = [
    { label: "التقارير", path: "/reports" },
    { label: "البرنامج", path: "/program" },
    { label: "حسابي", path: "/account" },
    { label: "صندوق الأفكار", path: "/ideas" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="القائمة الرئيسية"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-red-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">القائمة</h2>
          <button
            onClick={closeSidebar}
            className="text-white text-2xl hover:text-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            aria-label="إغلاق القائمة"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="py-6">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={closeSidebar}
                  className="block px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors font-semibold border-r-4 border-transparent hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Divider */}
        <div className="border-t border-gray-200 mx-4"></div>

        {/* Logout */}
        <div className="py-4 px-6">
          <button
            onClick={() => {
              // TODO: Implement logout with Supabase
              // await supabase.auth.signOut();
              closeSidebar();
              // navigate('/login');
            }}
            className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
