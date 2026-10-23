/**
 * Generate member ID in format:
 * - E followed by 4 digits for boys (E0001-E9999)
 * - F followed by 4 digits for girls (F0001-F9999)
 */

export function generateMemberId(gender: string): string {
  const prefix = gender?.toLowerCase() === 'female' || gender?.toLowerCase() === 'fille' ? 'F' : 'E';
  
  // Generate random 4-digit number
  const randomNumber = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  
  return `${prefix}${randomNumber}`;
}

/**
 * Generate multiple member IDs (for batch operations)
 */
export function generateMemberIds(gender: string, count: number = 1): string[] {
  const ids: string[] = [];
  const usedNumbers = new Set<number>();
  
  while (ids.length < count) {
    const id = generateMemberId(gender);
    // Ensure uniqueness
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  
  return ids;
}

/**
 * Validate member ID format
 */
export function isValidMemberId(id: string): boolean {
  return /^[EF]\d{4}$/.test(id);
}

/**
 * Extract gender from member ID
 */
export function getGenderFromMemberId(id: string): 'male' | 'female' | null {
  if (!isValidMemberId(id)) return null;
  return id.startsWith('E') ? 'male' : 'female';
}

/**
 * Format member ID for display (with possible spacing)
 */
export function formatMemberId(id: string): string {
  if (!isValidMemberId(id)) return id;
  return id; // Already in nice format: E0001
}
