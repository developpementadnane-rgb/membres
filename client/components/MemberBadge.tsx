import { forwardRef } from "react";

import organizationLogoUrl from "/organization-logo.webp";

interface MemberBadgeProps {
  firstName: string;
  lastName: string;
  birthDate?: string;
  memberId: string;
  patrol?: string;
  role?: string;
  guardianPhone?: string;
  qrCodeUrl: string;
}

const formatBirthDate = (birthDate?: string) => {
  if (!birthDate) return "";

  const [year, month, day] = birthDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : birthDate;
};

export const MemberBadge = forwardRef<HTMLDivElement, MemberBadgeProps>(
  ({ firstName, lastName, birthDate, memberId, patrol, role, guardianPhone, qrCodeUrl }, ref) => {
    const roleAndPatrol = [role, patrol ? `بدورية ${patrol}` : ""].filter(Boolean).join(" ");

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          width: "1011px",
          height: "638px",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
          border: "3px solid #166534",
          borderRadius: "24px",
          background: "#fffdf7",
          fontFamily: "Arial, Tahoma, sans-serif",
          color: "#172033",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "18px",
            background: "repeating-linear-gradient(135deg, #166534 0 16px, #b91c1c 16px 32px, #d4a72c 32px 48px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "34px",
            left: "44px",
            right: "44px",
            height: "104px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            direction: "ltr",
          }}
        >
          <div
            style={{
              width: "94px",
              height: "94px",
              borderRadius: "50%",
              border: "4px solid #b91c1c",
              background: "#fff7ed",
              color: "#166534",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.1,
              textAlign: "center",
              direction: "rtl",
            }}
          >
            <span style={{ fontSize: "35px", fontWeight: 900 }}>ش</span>
            <span style={{ fontSize: "14px", fontWeight: 800 }}>كشاف</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "18px", direction: "rtl" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "24px", fontWeight: 900, color: "#166534" }}>
                الكشفية الحسنية المغربية
              </p>
              <p style={{ margin: "5px 0 0", fontSize: "15px", color: "#64748b" }}>
                بطاقة العضوية الرسمية
              </p>
            </div>
            <img
              src={organizationLogoUrl}
              alt="شعار الكشفية الحسنية"
              style={{ width: "98px", height: "98px", objectFit: "contain" }}
            />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "158px",
            left: "44px",
            right: "44px",
            height: "2px",
            background: "#d4a72c",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "54px",
            top: "188px",
            width: "310px",
            height: "310px",
            padding: "14px",
            boxSizing: "border-box",
            background: "#ffffff",
            border: "6px solid #166534",
            borderRadius: "18px",
            boxShadow: "0 8px 18px rgba(22, 101, 52, 0.16)",
          }}
        >
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="رمز العضو"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          )}
        </div>

        <div
          style={{
            position: "absolute",
            top: "190px",
            right: "72px",
            width: "520px",
            textAlign: "right",
          }}
        >
          <p style={{ margin: "0 0 16px", fontSize: "38px", fontWeight: 900, whiteSpace: "nowrap", color: "#111827" }}>
            {firstName} {lastName}
          </p>
          <div style={{ display: "grid", gap: "13px", fontSize: "26px", fontWeight: 700, lineHeight: 1.25 }}>
            <p style={{ margin: 0 }}>تاريخ الميلاد: {formatBirthDate(birthDate)}</p>
            <p style={{ margin: 0 }}>ID: {memberId}</p>
            <p style={{ margin: 0 }}>{roleAndPatrol}</p>
            <p style={{ margin: 0 }}>رقم الولي: {guardianPhone || ""}</p>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "18px",
            left: "44px",
            right: "44px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            direction: "ltr",
            color: "#166534",
            fontSize: "16px",
            fontWeight: 700,
          }}
        >
          <span>SHM • Carte de membre</span>
          <span>عضوية كشفية رسمية</span>
        </div>
      </div>
    );
  },
);

MemberBadge.displayName = "MemberBadge";
