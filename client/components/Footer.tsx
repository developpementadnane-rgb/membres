export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-black text-white py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F1f75f54747b54e29825eb23fdf70cfc1%2Fa8caeb8f3ae14cfe9ddb9534cad38297?format=webp&width=800&height=1200"
                alt="شعار الكشفية الحسنية"
                className="w-10 h-10 flex-shrink-0"
              />
              <h3 className="text-lg font-bold">الكشفية الحسنية</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Plateforme de gestion et supervision pour les chefs du Scoutisme Hassani Marocain.
            </p>
          </div>
          {/* Info */}
          <div>
            <h3 className="text-lg font-bold mb-4">ℹ️ Infos</h3>
            <p className="text-sm text-gray-400">
              <span className="block">Portail v1.0</span>
              <span className="block">{currentYear} © SHM</span>
              <span className="block text-xs mt-2">Tous droits réservés</span>
              <span className="block text-xs mt-2">Créé par ADNANE BELKHADIR pour le Scout Hassania Marocain.</span>
              <span className="block text-xs mt-2" dir="rtl">تم تطوير هذه المنصة من قبل عدنان بلخدير، رئيس خلية المشاريع بفوج عمر الفاروق، مجموعة الأمل، فرع آسفي، الجمعية الكشفية الحسنية المغربية، لصالح فوج عمر الفاروق.</span>
            </p>
          </div>
        </div>
        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {currentYear} Portail des Chefs SHM. Tous droits réservés.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Plateforme de gestion des troupes et supervision des membres
          </p>
        </div>
      </div>
    </footer>
  );
}
