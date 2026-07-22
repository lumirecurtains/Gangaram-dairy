// ============================================================
// FSSAI VALIDATOR — Gangaram Merchant Onboarding
// Module 7 — Pure function: format-check only
// ============================================================

/**
 * Validates an FSSAI (Food Safety and Standards Authority of India)
 * licence number format.
 *
 * Format: 14 alphanumeric characters
 * Pattern: [1-9][0-9]{11}[0-9A-Za-z]{2}
 *
 * This is a format-level validation only, not a live government API check.
 * For production, integrate with the FSSAI verification API.
 */
export function validateFssaiNumber(fssai: string): { valid: boolean; reason?: string } {
  if (!fssai || typeof fssai !== "string") {
    return { valid: false, reason: "FSSAI number is required" };
  }

  const cleaned = fssai.replace(/\s/g, "");

  if (cleaned.length !== 14) {
    return { valid: false, reason: `FSSAI number must be 14 characters, got ${cleaned.length}` };
  }

  if (!/^\d{12}[A-Za-z0-9]{2}$/.test(cleaned)) {
    return { valid: false, reason: "FSSAI number format invalid: expected 12 digits + 2 alphanumeric" };
  }

  return { valid: true };
}

/**
 * Basic FSSAI number formatting for display.
 */
export function formatFssaiNumber(fssai: string): string {
  const cleaned = fssai.replace(/\s/g, "");
  if (cleaned.length !== 14) return fssai;
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)} ${cleaned.slice(12)}`;
}
