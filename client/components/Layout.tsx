import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  showHamburger?: boolean;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-scout-cream flex flex-col" dir="rtl">
      <Header />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
