import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { apiUrl } from "@/lib/api-config";
import { encryptBadgePayload } from "@/lib/badgeCrypto";
import { generateMemberId } from "../lib/memberIdGenerator";
import { MemberBadge } from "@/components/MemberBadge";
import Header from "@/components/Header";

interface RegistrationData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  userPhone?: string;
  birthDate?: string;
  gender?: string;
  patrol?: string;
  role?: string;
  roleName?: string;
  isHighPatrol?: boolean;
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  fatherPhone?: string;
  motherPhone?: string;
  homePhone?: string;
  email?: string;
  additionalInfo?: string;
}

export default function AccountConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [pinStatus, setPinStatus] = useState("");
  const autoGenerationStarted = useRef(false);

  // Get registration data from location state
  const registrationData: RegistrationData = location.state?.data || {};
  const userId: string = location.state?.userId || "";
  const memberId: string = location.state?.memberId || generateMemberId(registrationData.gender || "male");

  const generatePDF = async () => {
    if (!pdfRef.current) return;

    setGenerating(true);
    try {
      const qrValue = await encryptBadgePayload({
        i: memberId,
        f: registrationData.firstName || "",
        l: registrationData.lastName || "",
        b: registrationData.birthDate || null,
        gf: registrationData.guardianFirstName || null,
        gl: registrationData.guardianLastName || null,
        gp: registrationData.guardianPhone || registrationData.fatherPhone || null,
        gp2: registrationData.motherPhone || null,
        m: registrationData.additionalInfo || null,
      });
      // Le payload chiffré tient désormais sur quelques dizaines de
      // caractères (plus de page HTML embarquée), donc on peut se
      // permettre une correction d'erreur plus robuste ("Q") sans
      // risquer de dépasser la capacité du QR.
      const qrCodeDataUrl = await QRCode.toDataURL(qrValue, {
        errorCorrectionLevel: "Q",
        type: "image/png",
        width: 420,
        margin: 2,
      });

      setQrCode(qrCodeDataUrl);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 1011,
        windowHeight: 638,
      });
      const document = new jsPDF({ format: [85.6, 54], orientation: "landscape", unit: "mm" });
      document.addImage(canvas.toDataURL("image/jpeg", 0.85), "JPEG", 0, 0, 85.6, 54);
      const pdfDataUrl = document.output("dataurlstring");

      const response = await fetch(apiUrl("/api/auth/save-documents"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          generated_id: memberId,
          pdf_url: pdfDataUrl,
          qr_code_url: qrCodeDataUrl,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("save-documents failed:", response.status, errorText);
        throw new Error(`(${response.status}) ${errorText || "Document storage failed"}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Document storage failed");
      }

      setPdfUrl(result.user.pdf_url);
      setQrCode(result.user.qr_code_url);
      setPdfGenerated(true);
      await sendDocumentsEmail(result.user.pdf_url, result.user.qr_code_url);
      console.info("Member documents persisted", result.user);
    } catch (error) {
      console.error("Error generating member documents:", error);
      alert("تعذر إنشاء وحفظ المستندات. يرجى المحاولة مرة أخرى.");
    } finally {
      setGenerating(false);
    }
  };

  const sendDocumentsEmail = async (pdfUrl: string, qrUrl: string) => {
    if (!registrationData.email) return;
    setEmailSending(true);
    try {
      const response = await fetch(apiUrl("/api/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinataire: registrationData.email,
          sujet: "Vos documents d'inscription",
          nom: `${registrationData.firstName || ""} ${registrationData.lastName || ""}`.trim(),
          message: "Vous trouverez en pièces jointes votre carte de membre et votre QR code.",
          includePin: false,
          attachments: [
            { filename: `SHM_Account_${memberId}.pdf`, url: pdfUrl },
            { filename: `SHM_Account_${memberId}.png`, url: qrUrl },
          ],
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Documents non envoyés");
      setPinStatus("تم إرسال البطاقة ورمز QR إلى بريدك الإلكتروني");
    } catch (error) {
      console.error("Documents email error:", error);
      setPinStatus("تم إنشاء المستندات لكن تعذر إرسالها بالبريد الإلكتروني");
    } finally {
      setEmailSending(false);
    }
  };

  const sendConfirmationEmail = async () => {
    if (!registrationData.email) return;
    setEmailSending(true);
    setPinStatus("");
    try {
      const response = await fetch(apiUrl("/api/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinataire: registrationData.email,
          sujet: "Confirmation de votre inscription",
          nom: `${registrationData.firstName || ""} ${registrationData.lastName || ""}`.trim(),
          message: "Votre demande d'inscription a été reçue. Utilisez le PIN ci-dessous pour confirmer votre adresse email.",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Email non envoyé");
      setPinStatus("تم إرسال رمز التأكيد إلى بريدك الإلكتروني");
    } catch (error) {
      console.error("Confirmation email error:", error);
      setPinStatus("تعذر إرسال رمز التأكيد");
    } finally {
      setEmailSending(false);
    }
  };

  const verifyConfirmationPin = async () => {
    if (!registrationData.email || pin.length !== 6) return;
    try {
      const response = await fetch(apiUrl("/api/verify-pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinataire: registrationData.email, pin }),
      });
      const result = await response.json();
      if (result.ok) {
        setEmailVerified(true);
        setPinStatus("تم تأكيد البريد الإلكتروني بنجاح");
      } else {
        setPinStatus(result.error || "رمز غير صحيح");
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      setPinStatus("تعذر التحقق من الرمز");
    }
  };

  useEffect(() => {
    if (!emailVerified || !userId || !registrationData.firstName || autoGenerationStarted.current) return;

    autoGenerationStarted.current = true;
    void generatePDF();
  }, [emailVerified, userId, registrationData.firstName, memberId]);

  // Redirect if no data provided
  if (!userId || !registrationData.firstName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">خطأ</h1>
          <p className="text-gray-600 mb-6">لم يتم العثور على بيانات التسجيل</p>
          <Link
            to="/register"
            className="inline-block bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:shadow-lg transition-shadow"
          >
            العودة إلى التسجيل
          </Link>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("تم النسخ!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50" dir="rtl">
      <Header />

      <div style={{ position: "fixed", left: "-10000px", top: 0, pointerEvents: "none" }} aria-hidden="true">
        <MemberBadge
          ref={pdfRef}
          firstName={registrationData.firstName || ""}
          lastName={registrationData.lastName || ""}
          memberId={memberId}
          birthDate={registrationData.birthDate}
          patrol={registrationData.patrol}
          role={registrationData.roleName || registrationData.role}
          guardianPhone={registrationData.guardianPhone || registrationData.fatherPhone}
          qrCodeUrl={qrCode}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Success Message */}
        <div
          className="rounded-lg p-8 text-white text-center mb-8 shadow-lg"
          style={{ background: "linear-gradient(to left, #4ade80, #3b82f6)" }}
        >
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold mb-2">مبروك!</h1>
          <p className="text-lg">تم إنشاء حسابك بنجاح</p>
        </div>

        {/* Member Information Card */}
        <div
          className="bg-white rounded-lg shadow-lg p-8 mb-8"
          style={{ borderRight: "4px solid #dc2626" }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">معلومات حسابك</h2>

          {/* Member ID - Prominent */}
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              background: "linear-gradient(135deg, #fee2e2 0%, #f3e8ff 100%)",
              borderRight: "4px solid #dc2626",
            }}
          >
            <p className="text-gray-600 text-sm mb-2">
              رقم العضو الخاص بك
              <span className="block text-xs text-gray-500 mt-1">
                {memberId.startsWith("E") ? "(ذكر)" : memberId.startsWith("F") ? "(أنثى)" : ""}
              </span>
            </p>
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold" style={{ color: "#dc2626" }}>
                {memberId}
              </p>
              <button
                onClick={() => copyToClipboard(memberId)}
                className="font-bold py-2 px-4 rounded transition-colors"
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#991b1b")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
              >
                نسخ
              </button>
            </div>
          </div>

          {/* User ID */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <p className="text-gray-600 text-sm mb-2">معرف المستخدم</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-gray-800">{userId}</p>
              <button
                onClick={() => copyToClipboard(userId)}
                className="font-bold py-2 px-4 rounded transition-colors"
                style={{
                  backgroundColor: "#a855f7",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7e22ce")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#a855f7")}
              >
                نسخ
              </button>
            </div>
          </div>

          {/* Member Information */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4">البيانات الشخصية</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">الاسم</p>
                <p className="font-semibold text-gray-800">
                  {registrationData.firstName} {registrationData.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">الهاتف</p>
                <p className="font-semibold text-gray-800">{registrationData.userPhone}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">الفريق</p>
                <p className="font-semibold text-gray-800">{registrationData.patrol}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">الدور</p>
                <p className="font-semibold text-gray-800">{registrationData.role}</p>
              </div>
            </div>
          </div>
        </div>

        {emailVerified && (
        <>
        {/* PDF and QR Code Section */}
        <div
          className="bg-white rounded-lg shadow-lg p-8 mb-8"
          style={{ borderRight: "4px solid #2563eb" }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">تحميل شهادة التأكيد</h2>

          {!pdfGenerated ? (
            <p className="text-center text-gray-600">
              {generating ? "جاري إنشاء وحفظ المستندات..." : "جاري تحضير المستندات..."}
            </p>
          ) : (
            <div className="space-y-6">
              {/* PDF Download Button */}
              <div className="text-center">
                <a
                  href={pdfUrl}
                  download={`SHM_Account_${memberId}.pdf`}
                  className="inline-block font-bold py-3 px-8 rounded-lg transition-colors text-white"
                  style={{
                    backgroundColor: "#2563eb",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
                >
                  📥 تحميل ملف PDF
                </a>
              </div>

              {/* QR Code */}
              <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center">
                <p className="text-gray-600 mb-4 text-center">
                  امسح رمز الاستجابة السريعة بهاتفك الذكي للوصول إلى البيانات
                </p>
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="QR Code for Account Data"
                    className="border-4 rounded-lg"
                    style={{ borderColor: "#d1d5db", width: "200px", height: "200px" }}
                  />
                ) : (
                  <div
                    className="rounded-lg flex items-center justify-center"
                    style={{
                      width: "200px",
                      height: "200px",
                      backgroundColor: "#e5e7eb",
                    }}
                  >
                    <p className="text-gray-500">جاري إنشاء الرمز...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {!emailVerified && registrationData.email && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8" style={{ borderRight: "4px solid #16a34a" }}>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">تأكيد البريد الإلكتروني</h2>
            <p className="text-center text-gray-600 mb-4" dir="ltr">{registrationData.email}</p>
            <button
              type="button"
              onClick={sendConfirmationEmail}
              disabled={emailSending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg"
            >
              {emailSending ? "جاري الإرسال..." : "إرسال رمز التأكيد"}
            </button>
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="رمز من 6 أرقام"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-center"
                dir="ltr"
              />
              <button
                type="button"
                onClick={verifyConfirmationPin}
                disabled={pin.length !== 6}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold px-5 rounded-lg"
              >
                تأكيد
              </button>
            </div>
            {pinStatus && <p className="text-center text-sm mt-3 text-gray-600">{pinStatus}</p>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/login")}
            className="flex-1 font-bold py-3 px-6 rounded-lg transition-shadow text-white"
            style={{ background: "linear-gradient(to left, #dc2626, #7c3aed)" }}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 font-bold py-3 px-6 rounded-lg transition-colors"
            style={{ backgroundColor: "#d1d5db", color: "#374151" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#9ca3af")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#d1d5db")}
          >
            الرئيسية
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="text-white px-4 py-6 mt-12"
        style={{ background: "linear-gradient(to left, #dc2626, #7c3aed)" }}
      >
        <div className="max-w-4xl mx-auto text-center text-sm">
          <p>© 2026 الكشفية الحسنية صفي - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
