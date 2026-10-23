import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import PasswordInput from "@/components/PasswordInput";
import { generateMemberId } from "../lib/memberIdGenerator";
import { apiUrl } from "@/lib/api-config";

interface PatrolOption {
  id: string;
  name: string;
}

interface RoleOption {
  id: string;
  name: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [patrols, setPatrols] = useState<PatrolOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    patrol: "",
    role: "",
    isHighPatrol: false,

    // Guardian info
    guardianFirstName: "",
    guardianLastName: "",
    guardianRelationship: "",
    guardianRelationshipOther: "",
    guardianCin: "",

    // Contact info
    userPhone: "",
    email: "",

    fatherPhone: "",
    motherPhone: "",
    homePhone: "",

    additionalInfo: "",

    // Security
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetch(apiUrl("/api/auth/options"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error((await response.json()).error || "Impossible de charger les options");
        }
        return response.json();
      })
      .then(({ patrols: availablePatrols, roles: availableRoles }) => {
        setPatrols(availablePatrols);
        setRoles(availableRoles);
      })
      .catch((error) => {
        console.error("Registration options error:", error);
        alert("❌ Impossible de charger les rôles et les patrouilles");
      });
  }, []);

  const normalizeFieldValue = (name: string, value: string) => {
    if (name === "password" || name === "confirmPassword") return value;
    return value.trim().replace(/\s+/g, " ");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : normalizeFieldValue(name, value),
    }));
    
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "الاسم الأول مطلوب";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "النسب مطلوب";
    }
    if (!formData.birthDate) {
      newErrors.birthDate = "تاريخ الميلاد مطلوب";
    } else {
      const age = calculateAge(formData.birthDate);
      if (age === null || age < 12 || age > 20) {
        newErrors.birthDate = "العمر يجب أن يكون بين 12 و 20 سنة";
      }
    }
    if (!formData.gender) {
      newErrors.gender = "الجنس مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.patrol) {
      newErrors.patrol = "اختيار الدورية مطلوب";
    }
    if (!formData.role) {
      newErrors.role = "اختيار الدور مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    const phoneRegex = /^0[5678]\d{8}$/;
    if (!phoneRegex.test(formData.userPhone)) {
      newErrors.userPhone = "رقم الهاتف غير صحيح (10 أرقام تبدأ بـ 05 أو 06 أو 07 أو 08)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.guardianFirstName.trim()) {
      newErrors.guardianFirstName = "اسم الولي مطلوب";
    }
    if (!formData.guardianLastName.trim()) {
      newErrors.guardianLastName = "لقب الولي مطلوب";
    }
    if (!formData.guardianRelationship) {
      newErrors.guardianRelationship = "الصفة مطلوبة";
    }
    if (formData.guardianRelationship === "other" && !formData.guardianRelationshipOther.trim()) {
      newErrors.guardianRelationshipOther = "يرجى توضيح الصفة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = () => {
    const newErrors: Record<string, string> = {};

    // Validate password
    if (!formData.password.trim()) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else if (formData.password.length < 8) {
      newErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }

    // Validate confirm password
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "تأكيد كلمة المرور مطلوب";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "كلمة المرور غير متطابقة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;

    if (step === 1) {
      isValid = validateStep1();
    } else if (step === 2) {
      isValid = validateStep2();
    } else if (step === 3) {
      isValid = validateStep3();
    } else if (step === 4) {
      isValid = validateStep4();
    }

    if (isValid) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate step 5 (password)
    if (!validateStep5()) {
      return;
    }

    try {
      // Register user in database
      const response = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          birth_date: formData.birthDate,
          gender: formData.gender,
          user_phone: formData.userPhone,
          email: formData.email,
          patrol_id: formData.patrol,
          role_id: formData.role,
          is_high_patrol: formData.isHighPatrol,
          guardian_first_name: formData.guardianFirstName,
          guardian_last_name: formData.guardianLastName,
          guardian_relationship: formData.guardianRelationship,
          guardian_relationship_other: formData.guardianRelationshipOther,
          guardian_cin: formData.guardianCin,
          father_phone: formData.fatherPhone,
          mother_phone: formData.motherPhone,
          home_phone: formData.homePhone,
          additional_info: formData.additionalInfo,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert("❌ " + (error.error || "Erreur lors de l'enregistrement"));
        return;
      }

      const userData = await response.json();
      const memberId = userData.generated_id;
      const userId = userData.id;

      // Redirect to account confirmation page with data
      navigate("/account-confirmation", {
        state: {
          userId,
          memberId,
          data: {
            ...formData,
            firstName: userData.first_name,
            lastName: userData.last_name,
            // Le rôle doit être lisible pour le badge/QR chiffré (le chef
            // voit un nom, pas un ID) ; la patrouille reste envoyée comme
            // simple code (1/2/3/4), résoudre son nom sort du périmètre
            // de cette tâche.
            roleName: roles.find((r) => r.id === formData.role)?.name || formData.role,
          },
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      alert("❌ Erreur lors de l'enregistrement");
    }
  };

  const age = calculateAge(formData.birthDate);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cream" dir="rtl">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Registration Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-l from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
              إنشاء حساب جديد
            </h1>
            <p className="text-gray-600 mb-4">
              المرحلة {step} من 5
            </p>
            
            {/* Progress Bar */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    s <= step ? "bg-gradient-to-r from-red-600 to-purple-600" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={step === 5 ? handleSubmit : (e) => e.preventDefault()}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border-t-4 border-gradient-to-r from-red-600 to-purple-600">
                <h2 className="text-xl font-bold text-gray-800 mb-4">المعلومات الشخصية</h2>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    الاسم الأول
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="أدخل اسمك الأول"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.firstName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    النسب / اللقب
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="أدخل لقبك"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.lastName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    تاريخ الميلاد
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.birthDate ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formData.birthDate && (
                    <p className="text-gray-600 text-sm mt-2">
                      العمر: {age} سنة
                    </p>
                  )}
                  {errors.birthDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    الجنس
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.gender ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">اختر الجنس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-2 rounded-lg transition-all mt-6"
                >
                  التالي
                </button>
              </div>
            )}

            {/* Step 2: Patrol & Role */}
            {step === 2 && (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border-t-4 border-gradient-to-r from-red-600 to-purple-600">
                <h2 className="text-xl font-bold text-gray-800 mb-4">الانتساب للكشفية</h2>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    اختيار الدورية
                  </label>
                  <select
                    name="patrol"
                    value={formData.patrol}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.patrol ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">اختر دورية</option>
                    {patrols.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {errors.patrol && (
                    <p className="text-red-500 text-sm mt-1">{errors.patrol}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    اختيار الدور
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.role ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">اختر دور</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {errors.role && (
                    <p className="text-red-500 text-sm mt-1">{errors.role}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <input
                    type="checkbox"
                    name="isHighPatrol"
                    id="isHighPatrol"
                    checked={formData.isHighPatrol}
                    onChange={handleChange}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isHighPatrol" className="text-sm text-gray-700 cursor-pointer">
                    أنا عضو في الدورية العليا
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition-colors"
                  >
                    السابق
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-2 rounded-lg transition-all"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Info */}
            {step === 3 && (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border-t-4 border-gradient-to-r from-red-600 to-purple-600">
                <h2 className="text-xl font-bold text-gray-800 mb-4">معلومات الاتصال</h2>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    البريد الإلكتروني (اختياري)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    autoComplete="email"
                    dir="ltr"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    رقم هاتفك
                  </label>
                  <input
                    type="tel"
                    name="userPhone"
                    value={formData.userPhone}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        userPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }));
                      setErrors((prev) => ({ ...prev, userPhone: "" }));
                    }}
                    placeholder="06 xx xx xx xx"
                    inputMode="numeric"
                    pattern="0[5678][0-9]{8}"
                    maxLength={10}
                    autoComplete="tel"
                    dir="ltr"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.userPhone ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <p className="text-gray-500 text-xs mt-1" dir="rtl">
                    10 أرقام تبدأ بـ 05 أو 06 أو 07 أو 08
                  </p>
                  {errors.userPhone && (
                    <p className="text-red-500 text-sm mt-1">{errors.userPhone}</p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition-colors"
                  >
                    السابق
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-2 rounded-lg transition-all"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Guardian Info */}
            {step === 4 && (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border-t-4 border-gradient-to-r from-red-600 to-purple-600">
                <h2 className="text-xl font-bold text-gray-800 mb-4">معلومات الولي</h2>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    اسم الولي
                  </label>
                  <input
                    type="text"
                    name="guardianFirstName"
                    value={formData.guardianFirstName}
                    onChange={handleChange}
                    placeholder="أدخل اسم الولي"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.guardianFirstName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.guardianFirstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.guardianFirstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    لقب الولي
                  </label>
                  <input
                    type="text"
                    name="guardianLastName"
                    value={formData.guardianLastName}
                    onChange={handleChange}
                    placeholder="أدخل لقب الولي"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.guardianLastName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.guardianLastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.guardianLastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    الصفة / القرابة
                  </label>
                  <select
                    name="guardianRelationship"
                    value={formData.guardianRelationship}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                      errors.guardianRelationship ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">اختر الصفة</option>
                    <option value="father">أب</option>
                    <option value="mother">أم</option>
                    <option value="other">آخر</option>
                  </select>
                  {errors.guardianRelationship && (
                    <p className="text-red-500 text-sm mt-1">{errors.guardianRelationship}</p>
                  )}
                </div>

                {formData.guardianRelationship === "other" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      توضيح الصفة
                    </label>
                    <input
                      type="text"
                      name="guardianRelationshipOther"
                      value={formData.guardianRelationshipOther}
                      onChange={handleChange}
                      placeholder="مثال: عم، خالة، جد، إلخ"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                        errors.guardianRelationshipOther ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.guardianRelationshipOther && (
                      <p className="text-red-500 text-sm mt-1">{errors.guardianRelationshipOther}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    رقم البطاقة الوطنية
                  </label>
                  <input
                    type="text"
                    name="guardianCin"
                    value={formData.guardianCin}
                    onChange={handleChange}
                    placeholder="رقم البطاقة (اختياري)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition-colors"
                  >
                    السابق
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-2 rounded-lg transition-all"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Additional Contact Info */}
            {step === 5 && (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border-t-4 border-gradient-to-r from-red-600 to-purple-600">
                <h2 className="text-xl font-bold text-gray-800 mb-4">معلومات الاتصال الإضافية</h2>

                <div className="bg-purple-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">أرقام الهواتف الإضافية (اختياري)</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    هاتف الأب
                  </label>
                  <input
                    type="tel"
                    name="fatherPhone"
                    value={formData.fatherPhone}
                    onChange={handleChange}
                    placeholder="+212 6xx xxx xxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    هاتف الأم
                  </label>
                  <input
                    type="tel"
                    name="motherPhone"
                    value={formData.motherPhone}
                    onChange={handleChange}
                    placeholder="+212 6xx xxx xxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    هاتف المنزل (اختياري)
                  </label>
                  <input
                    type="tel"
                    name="homePhone"
                    value={formData.homePhone}
                    onChange={handleChange}
                    placeholder="رقم هاتف ثابت"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    معلومات إضافية
                  </label>
                  <textarea
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    placeholder="أي معلومات إضافية مهمة..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                {/* Security Section */}
                <div className="border-t-2 border-purple-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">أمان الحساب</h3>

                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    label="كلمة المرور"
                    placeholder="أدخل كلمة مرور قوية (8 أحرف على الأقل)"
                    minLength={8}
                    required
                    error={errors.password}
                  />

                  <div className="mt-4">
                    <PasswordInput
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      label="تأكيد كلمة المرور"
                      placeholder="أعد كتابة كلمة المرور"
                      minLength={8}
                      required
                      error={errors.confirmPassword}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition-colors"
                  >
                    السابق
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-l from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-2 rounded-lg transition-all"
                  >
                    إنشاء الحساب
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Already have account */}
          {step === 1 && (
            <div className="text-center mt-6">
              <p className="text-gray-600 text-sm mb-2">
                هل لديك حساب بالفعل؟
              </p>
              <a
                href="/login"
                className="text-purple-600 font-bold hover:text-purple-700 transition-colors"
              >
                قم بتسجيل الدخول
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
