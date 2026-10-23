export default function Header() {
  return (
    <header
      className="bg-gradient-to-l from-red-600 to-purple-600 text-white px-4 py-4 sticky top-0 z-40 shadow-lg"
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-center">
        <div className="flex items-center gap-3 text-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F1f75f54747b54e29825eb23fdf70cfc1%2Fa8caeb8f3ae14cfe9ddb9534cad38297?format=webp&width=800&height=1200"
            alt="شعار الكشفية الحسنية المغربية"
            className="w-12 h-12 flex-shrink-0"
          />
          <div className="text-right">
            <h1 className="text-lg md:text-xl font-bold text-white">
              الكشفية الحسنية المغربية
            </h1>
            <p className="text-xs md:text-sm text-red-100">بوابة الأعضاء</p>
          </div>
        </div>
      </div>
    </header>
  );
}
