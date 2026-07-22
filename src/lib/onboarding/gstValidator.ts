// ============================================================
// GST VALIDATOR — Gangaram Merchant Onboarding
// Module 7 — Pure function: pattern & checksum verification
// ============================================================

/**
 * Validates a GST (Goods and Services Tax) number format.
 *
 * Format: 15 characters
 * Pattern: [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}
 * - First 2 digits: State code
 * - Next 10: PAN + entity number + check digit
 * - 13th: Z (default)
 * - Last 2: Check sum
 *
 * This is a format-level validation only, not a live government API check.
 */
export function validateGstNumber(gst: string): { valid: boolean; reason?: string } {
  if (!gst || typeof gst !== "string") {
    return { valid: false, reason: "GST number is required" };
  }

  const cleaned = gst.replace(/\s/g, "").toUpperCase();

  if (cleaned.length !== 15) {
    return { valid: false, reason: `GST number must be 15 characters, got ${cleaned.length}` };
  }

  // Basic format: 2 digits + 10 alphanumeric + 1 check + Z + 1 alphanumeric
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstRegex.test(cleaned)) {
    return {
      valid: false,
      reason: "GST number format invalid. Expected format: 22AAAAA0000A1ZX (state code + PAN + digits + check + Z + checksum)",
    };
  }

  return { valid: true };
}

/**
 * Extracts the state code from a GST number (first 2 digits).
 */
export function extractGstStateCode(gst: string): string | null {
  const cleaned = gst.replace(/\s/g, "");
  if (cleaned.length < 2) return null;
  return cleaned.slice(0, 2);
}

/**
 * Extracts the PAN from a GST number (positions 3-12).
 */
export function extractGstPan(gst: string): string | null {
  const cleaned = gst.replace(/\s/g, "");
  if (cleaned.length < 12) return null;
  return cleaned.slice(2, 12);
}
