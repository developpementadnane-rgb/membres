import Sidebar from "./Sidebar";
import { useLocation } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const location = useLocation();
  const showSidebar = location.pathname !== "/";

  return (
    <PrivateRoute>
      <div className="flex min-h-screen bg-gray-50">
        {showSidebar && <Sidebar />}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </PrivateRoute>
  );
}
