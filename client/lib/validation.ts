/**
 * Validation utilities for Scout Portal
 * Handles validation of phone, email, age, and other form fields
 */

/**
 * Validate phone number format
 * Moroccan format: +212 followed by 9 digits starting with 5, 6, or 7
 * @param phone - Phone number with +212 prefix
 * @returns {boolean} True if valid
 */
export const validatePhone = (phone: string): boolean => {
  const phoneValue = phone.replace("+212", "");
  const phoneRegex = /^[567]\d{8}$/;
  return phoneRegex.test(phoneValue);
};

/**
 * Validate email format
 * Only accepts gmail.com, yahoo.com, or hotmail.com
 * @param email - Email address
 * @returns {boolean} True if valid
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@(gmail|yahoo|hotmail)\.com$/;
  return emailRegex.test(email);
};

/**
 * Calculate age from birth date
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns {number|null} Age in years or null if invalid
 */
export const calculateAge = (birthDate: string): number | null => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const today = new Date();
  
  if (birth > today) return null; // Future date
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Validate age is within required range (12-20 years)
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns {boolean} True if age is valid
 */
export const validateAge = (birthDate: string): boolean => {
  const age = calculateAge(birthDate);
  return age !== null && age >= 12 && age <= 20;
};

/**
 * Validate password strength
 * Minimum 6 characters required
 * @param password - Password string
 * @returns {boolean} True if valid
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Validate name field
 * Must not be empty or just whitespace
 * @param name - Name string
 * @returns {boolean} True if valid
 */
export const validateName = (name: string): boolean => {
  return name.trim().length > 0;
};

/**
 * Auto-generate user ID based on gender
 * Format: E0001 (male) or F0001 (female)
 * @param gender - "male" or "female"
 * @param existingIds - Array of existing IDs to determine next number
 * @returns {string} Generated ID
 */
export const generateUserId = (gender: string, existingIds: string[] = []): string => {
  const prefix = gender === "male" ? "E" : "F";
  
  // Filter IDs with same prefix
  const sameGenderIds = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.substring(1), 10))
    .filter((num) => !isNaN(num));
  
  // Get next number
  const nextNumber = sameGenderIds.length > 0 ? Math.max(...sameGenderIds) + 1 : 1;
  
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

/**
 * Format phone number with +212 prefix
 * @param phone - Phone number (9 digits)
 * @returns {string} Formatted phone with +212 prefix
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 9) {
    return "+212" + cleaned;
  }
  return "+212" + cleaned.slice(-9); // Take last 9 digits
};

/**
 * Format date to readable format
 * @param dateString - Date in YYYY-MM-DD format
 * @param locale - Locale code (default: "ar-MA")
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString: string, locale: string = "ar-MA"): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Validate required field
 * @param value - Field value
 * @returns {boolean} True if not empty
 */
export const isRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate minimum text length
 * @param text - Text to validate
 * @param minLength - Minimum required length
 * @returns {boolean} True if text length >= minLength
 */
export const validateMinLength = (text: string, minLength: number): boolean => {
  return text.trim().length >= minLength;
};

/**
 * Validate maximum text length
 * @param text - Text to validate
 * @param maxLength - Maximum allowed length
 * @returns {boolean} True if text length <= maxLength
 */
export const validateMaxLength = (text: string, maxLength: number): boolean => {
  return text.length <= maxLength;
};

/**
 * Validate guardian relationship type
 * @param relationship - Relationship value
 * @returns {boolean} True if valid
 */
export const validateRelationship = (relationship: string): boolean => {
  const validRelationships = ["father", "mother", "other"];
  return validRelationships.includes(relationship);
};

/**
 * Get error message for validation failure
 * @param fieldName - Name of the field
 * @param validationType - Type of validation that failed
 * @returns {string} Error message in Arabic
 */
export const getErrorMessage = (
  fieldName: string,
  validationType: string
): string => {
  const messages: Record<string, Record<string, string>> = {
    firstName: {
      required: "الاسم الأول مطلوب",
    },
    lastName: {
      required: "النسب / اللقب مطلوب",
    },
    birthDate: {
      required: "تاريخ الميلاد مطلوب",
      age: "العمر يجب أن يكون بين 10 و 16 سنة",
    },
    gender: {
      required: "الجنس مطلوب",
    },
    patrol: {
      required: "اختيار الدورية مطلوب",
    },
    role: {
      required: "اختيار الدور مطلوب",
    },
    userPhone: {
      invalid:
        "رقم الهاتف غير صحيح (9 أرقام تبدأ بـ 5 أو 6 أو 7)",
    },
    userEmail: {
      invalid:
        "البريد الإلكتروني يجب أن يكون من gmail أو yahoo أو hotmail",
    },
    userPassword: {
      required: "كلمة المرور مطلوبة",
      minLength: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    },
    guardianFirstName: {
      required: "اسم الولي مطلوب",
    },
    guardianLastName: {
      required: "لقب الولي مطلوب",
    },
    guardianRelationship: {
      required: "الصفة مطلوبة",
    },
    guardianRelationshipOther: {
      required: "يرجى توضيح الصفة",
    },
    title: {
      required: "عنوان الفكرة مطلوب",
    },
    description: {
      required: "شرح الفكرة مطلوب",
      minLength: "الشرح يجب أن يكون أطول (20 حرف على الأقل)",
    },
  };

  return messages[fieldName]?.[validationType] || "حقل غير صحيح";
};
