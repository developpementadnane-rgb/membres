import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SidebarProvider } from "./context/SidebarContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedLayout from "./components/ProtectedLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AccountConfirmation from "./pages/AccountConfirmation";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ReportDetails from "./pages/ReportDetails";
import AddReport from "./pages/AddReport";
import Program from "./pages/Program";
import Ideas from "./pages/Ideas";
import MyProfile from "./pages/MyProfile";
import Membership from "./pages/Membership";
import Sessions from "./pages/Sessions";
import SyncCache from "./pages/SyncCache";
import Attendance from "./pages/Attendance";
import Gallery from "./pages/Gallery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Renews the local 20-day session on every navigation — the simplest
 * reliable proxy for "the member did something", without having to
 * wire an explicit touch call into every individual button/action
 * across the app. A no-op while logged out.
 */
function SessionRenewalTracker() {
  const location = useLocation();
  const { renewSession } = useAuth();

  useEffect(() => {
    renewSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SidebarProvider>
          <BrowserRouter>
            <SessionRenewalTracker />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account-confirmation" element={<AccountConfirmation />} />

              {/* Protected routes - require authentication */}
              <Route
                path="/"
                element={
                  <ProtectedLayout>
                    <Index />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedLayout>
                    <Dashboard />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedLayout>
                    <Reports />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/reports/:id"
                element={
                  <ProtectedLayout>
                    <ReportDetails />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/add-report"
                element={
                  <ProtectedLayout>
                    <AddReport />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/program"
                element={
                  <ProtectedLayout>
                    <Program />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/ideas"
                element={
                  <ProtectedLayout>
                    <Ideas />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedLayout>
                    <MyProfile />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/my-profile"
                element={
                  <ProtectedLayout>
                    <MyProfile />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/membership"
                element={
                  <ProtectedLayout>
                    <Membership />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/sessions"
                element={
                  <ProtectedLayout>
                    <Sessions />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/sync-cache"
                element={
                  <ProtectedLayout>
                    <SyncCache />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedLayout>
                    <Attendance />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/gallery"
                element={
                  <ProtectedLayout>
                    <Gallery />
                  </ProtectedLayout>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
