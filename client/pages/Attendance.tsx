import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardCheck, Filter, Loader2, RefreshCw, UserX, WifiOff, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { fetchAttendance, type AttendanceRecord as ApiAttendanceRecord } from "@/lib/api";
import { listQrRecords } from "@/lib/offline/qrOfflineStore";
import type { OfflineQrRecord } from "@/lib/offline/types";

type AttendanceStatus = "present" | "absent";
type AttendanceFilter = "all" | AttendanceStatus;

interface AttendanceRecord {
  id: string;
  date: string;
  sessionName: string;
  status: AttendanceStatus;
}

function toDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function toDisplayRecord(record: ApiAttendanceRecord): AttendanceRecord {
  return {
    id: record.id,
    date: toDateOnly(record.session?.session_date) ?? toDateOnly(record.created_at) ?? "",
    sessionName: record.session?.title || "الحصة الكشفية",
    status: record.present ? "present" : "absent",
  };
}

const formatDate = (date: string) => {
  const normalizedDate = toDateOnly(date);
  if (!normalizedDate) return "تاريخ غير متوفر";

  return new Intl.DateTimeFormat("ar-MA", { dateStyle: "long" }).format(
    new Date(`${normalizedDate}T00:00:00`),
  );
};

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [period, setPeriod] = useState("");
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offlineRecords, setOfflineRecords] = useState<OfflineQrRecord[]>([]);

  useEffect(() => {
    fetchAttendance()
      .then((data) => setRecords(data.map(toDisplayRecord)))
      .catch((error) => setLoadError(error instanceof Error ? error.message : "تعذر تحميل سجل الحضور."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void listQrRecords().then((all) => {
        if (!cancelled) setOfflineRecords(all.filter((r) => !r.synced || r.sync_result));
      });
    };
    refresh();
    const intervalId = window.setInterval(refresh, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesPeriod = !period || record.date.startsWith(period);
        const matchesStatus = filter === "all" || record.status === filter;
        return matchesPeriod && matchesStatus;
      }),
    [filter, period, records],
  );

  const presentCount = records.filter((record) => record.status === "present").length;
  const absentCount = records.filter((record) => record.status === "absent").length;
  const summaryCards = [
    { label: "إجمالي الحصص", value: String(records.length), icon: CalendarDays, color: "text-purple-600", background: "bg-purple-50" },
    { label: "الحضور", value: String(presentCount), icon: CheckCircle2, color: "text-emerald-600", background: "bg-emerald-50" },
    { label: "الغياب", value: String(absentCount), icon: UserX, color: "text-red-600", background: "bg-red-50" },
    { label: "نسبة الحضور", value: records.length ? `${Math.round((presentCount / records.length) * 100)}%` : "0%", icon: ClipboardCheck, color: "text-blue-600", background: "bg-blue-50" },
  ];

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-scout-purple to-red-600 text-white shadow-lg">
            <ClipboardCheck size={28} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">الحضور</h1>
          <p className="mt-2 text-gray-600">تابع سجل حضورك في حصص الكشفية الحسنية</p>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" aria-label="ملخص الحضور">
          {summaryCards.map(({ label, value, icon: Icon, color, background }) => (
            <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${background} ${color}`}>
                <Icon size={21} />
              </div>
              <p className="text-sm font-semibold text-gray-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 md:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Filter className="text-scout-purple" size={20} />
            <h2 className="text-lg font-bold text-gray-800">تصفية سجل الحضور</h2>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-xs">
              <label htmlFor="attendance-period" className="mb-2 block text-sm font-semibold text-gray-700">الفترة</label>
              <input
                id="attendance-period"
                type="month"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-700 outline-none transition focus:border-scout-purple focus:ring-2 focus:ring-purple-100"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["all", "جميع الحصص"],
                ["present", "الحضور"],
                ["absent", "الغياب"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${filter === value ? "bg-scout-purple text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loadError && <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{loadError}</div>}

        {offlineRecords.length > 0 && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-amber-100">
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3 md:px-6">
              <WifiOff size={18} className="text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800">محاولات تسجيل حضور تمّت دون اتصال بالإنترنت</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {offlineRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                  <div className="text-sm">
                    <p className="font-semibold text-gray-700">{record.session_title || "بانتظار التحقق من الحصة"}</p>
                    <p className="text-gray-500">{new Date(record.scanned_at).toLocaleString("ar-MA")}</p>
                  </div>
                  <OfflineSyncBadge record={record} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 md:px-6">
            <h2 className="text-lg font-bold text-gray-800">سجل الحضور</h2>
            <span className="text-sm text-gray-500">{filteredRecords.length} حصة</span>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-gray-500"><Loader2 className="animate-spin" size={22} /> جارٍ تحميل سجل الحضور...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ClipboardCheck className="mx-auto mb-4 text-gray-300" size={42} />
              <p className="text-lg font-bold text-gray-600">لا توجد بيانات حضور بعد</p>
              <p className="mt-2 text-sm text-gray-500">سيظهر سجل حضورك هنا بعد تسجيل حضورك في أولى الحصص.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-right">
                  <thead className="bg-gray-50 text-sm text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">تاريخ الحصة</th>
                      <th className="px-6 py-4 font-semibold">اسم الحصة</th>
                      <th className="px-6 py-4 font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.map((record) => <AttendanceRow key={record.id} record={record} />)}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {filteredRecords.map((record) => <AttendanceCard key={record.id} record={record} />)}
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}

function OfflineSyncBadge({ record }: { record: OfflineQrRecord }) {
  if (!record.synced) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">
        <RefreshCw size={15} /> بانتظار المزامنة
      </span>
    );
  }
  if (record.sync_result === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-700">
        <XCircle size={15} /> {record.sync_error || "لم يتم قبول المحاولة"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
      <CheckCircle2 size={15} /> تمت المزامنة بنجاح
    </span>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const present = status === "present";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${present ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {present ? <CheckCircle2 size={15} /> : <UserX size={15} />}
      {present ? "حاضر" : "غائب"}
    </span>
  );
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  return <tr className="text-gray-700"><td className="px-6 py-4">{formatDate(record.date)}</td><td className="px-6 py-4 font-semibold">{record.sessionName}</td><td className="px-6 py-4"><StatusBadge status={record.status} /></td></tr>;
}

function AttendanceCard({ record }: { record: AttendanceRecord }) {
  return <article className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-gray-500">{formatDate(record.date)}</p><p className="mt-1 font-bold text-gray-800">{record.sessionName}</p></div><StatusBadge status={record.status} /></div></article>;
}
