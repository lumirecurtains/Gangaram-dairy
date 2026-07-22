// ============================================================
// TOKEN CLAIMS HELPER — Gangaram Client
// Module 8 — UX-only helpers for reading and formatting claims
// ============================================================

import type { IdTokenResult } from "firebase/auth";

export type UserRole =
  | "customer"
  | "merchant_staff"
  | "rider"
  | "support_agent"
  | "super_admin";

export interface ParsedClaims {
  isSuperAdmin: boolean;
  isSupportAgent: boolean;
  isMerchantStaff: boolean;
  isRider: boolean;
  merchantId: string | null;
}

export function parseClaims(tokenResult: IdTokenResult | null): ParsedClaims {
  if (!tokenResult?.claims) {
    return { isSuperAdmin: false, isSupportAgent: false, isMerchantStaff: false, isRider: false, merchantId: null };
  }

  const claims = tokenResult.claims;
  return {
    isSuperAdmin: !!claims.super_admin,
    isSupportAgent: !!claims.support_agent,
    isMerchantStaff: !!claims.merchant_staff,
    isRider: !!claims.rider,
    merchantId: typeof claims.merchantId === "string" ? claims.merchantId : null,
  };
}

/**
 * Checks whether the given role has kitchen dashboard access.
 */
export function canAccessKitchen(claims: ParsedClaims): boolean {
  return claims.isMerchantStaff || claims.isSuperAdmin;
}

export function canAccessDriverDashboard(claims: ParsedClaims): boolean {
  return claims.isRider || claims.isSuperAdmin;
}

export function canAccessAdmin(claims: ParsedClaims): boolean {
  return claims.isSuperAdmin || claims.isSupportAgent;
}

/**
 * Returns a human-readable label for a role.
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    customer: "Customer",
    merchant_staff: "Restaurant Staff",
    rider: "Delivery Rider",
    support_agent: "Support Agent",
    super_admin: "Super Admin",
  };
  return labels[role] || "Unknown";
}

/**
 * Returns the color token for a role badge.
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    customer: "var(--text-secondary)",
    merchant_staff: "var(--accent)",
    rider: "var(--primary)",
    support_agent: "var(--warning)",
    super_admin: "var(--error)",
  };
  return colors[role] || "var(--text-secondary)";
}
