import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function Index() {
  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="space-y-6">
          {/* Login Link */}
          <Link
            to="/login"
            className="block w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-4 px-6 rounded-lg hover:shadow-lg transition-shadow text-center text-lg"
          >
            تسجيل الدخول
          </Link>

          {/* Forgot Password Link */}
          <Link
            to="/forgot-password"
            className="block w-full bg-white text-gray-700 font-bold py-4 px-6 rounded-lg border-2 border-gradient-to-l from-red-600 to-purple-600 hover:shadow-lg transition-shadow text-center text-lg"
          >
            هل نسيت كلمة المرور؟
          </Link>
        </div>
      </div>
    </Layout>
  );
}
