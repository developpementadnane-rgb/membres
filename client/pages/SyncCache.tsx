import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useNetworkStatus } from "@/lib/offline/network";
import { User as UserIcon, Phone, Mail, IdCard, ShieldCheck } from "lucide-react";

/**
 * Offline member info page -- shows the member's own general info + QR
 * code so it stays readable with no network connection, since the whole
 * point of a session persisted in @capacitor/preferences is for it to
 * survive being offline. No attendance/sync-queue/ideas data lives here
 * anymore: this page is personal info only, read straight from the
 * locally persisted session (AuthContext already restores that from
 * native storage on native builds).
 */
export default function SyncCache() {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();

  return (
    <Layout currentPage="sync-cache">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-3 text-4xl font-black shm-text-gradient uppercase tracking-wider">
            معلوماتي
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
              isOnline ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
            {isOnline ? "متصل" : "غير متصل"}
          </span>
        </div>
      </div>

      {!user ? (
        <div className="rounded-[2rem] border-2 border-dashed border-gray-100 bg-white py-16 text-center">
          <p className="font-black uppercase tracking-[0.15em] text-gray-300">لا توجد بيانات محفوظة</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[auto,1fr] sm:items-start">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            {user.qr_code_url ? (
              <img
                src={user.qr_code_url}
                alt="QR العضو"
                className="h-40 w-40 rounded-xl border border-gray-200 object-contain"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-gray-300 text-center text-xs font-bold text-gray-400">
                QR غير مولد
              </div>
            )}
            <p className="text-xs font-black text-scout-purple">رمز العضوية</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <InfoRow icon={<UserIcon size={16} />} label="الاسم الكامل" value={`${user.first_name} ${user.last_name}`} />
            <InfoRow icon={<IdCard size={16} />} label="المعرف" value={user.generated_id} />
            <InfoRow icon={<Phone size={16} />} label="الهاتف" value={user.user_phone} />
            {user.email && <InfoRow icon={<Mail size={16} />} label="البريد الإلكتروني" value={user.email} />}
            <InfoRow
              icon={<ShieldCheck size={16} />}
              label="حالة العضوية"
              value={getMembershipStatus(user.payment_completed, user.documents_completed)}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

function getMembershipStatus(paymentCompleted?: boolean, documentsCompleted?: boolean) {
  if (paymentCompleted && documentsCompleted) return "العضوية مكتملة";
  if (paymentCompleted) return "الواجب مؤدى - الوثائق غير مكتملة";
  if (documentsCompleted) return "الوثائق مكتملة - الواجب غير مؤدى";
  return "العضوية غير مكتملة";
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-scout-purple">
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-xs font-bold text-gray-400">{label}</p>
        <p className="truncate font-black text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}
