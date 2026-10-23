import { useEffect, useState } from "react";
import { getKeyFingerprint } from "@/lib/badgeCrypto";

/**
 * Affiche une empreinte NON RÉVERSIBLE de VITE_BADGE_ENCRYPTION_KEY,
 * jamais la clé elle-même. Composant identique côté Qiadati
 * (BadgeKeyFingerprint.tsx) -- comparez les deux valeurs : si elles
 * diffèrent, les deux déploiements n'utilisent pas la même clé (point 1).
 */
export default function BadgeKeyFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    getKeyFingerprint().then(setFingerprint);
  }, []);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 flex items-center gap-3" dir="rtl">
      <p className="text-xs text-gray-500">
        بصمة مفتاح رمز QR لهذا الموقع: <code className="font-mono font-semibold text-gray-700">{fingerprint ?? "..."}</code>
        {" "}— قارنها بنفس البصمة في موقع القادة. إذا اختلفت، فالمفتاحان غير متطابقين.
      </p>
    </div>
  );
}
