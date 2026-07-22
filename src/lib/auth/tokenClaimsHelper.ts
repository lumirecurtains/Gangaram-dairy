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
  role: UserRole;
  merchantId: string | null;
}

/**
 * Safely extracts role and merchantId from a Firebase IdTokenResult.
 * Returns safe defaults if claims are missing or malformed.
 */
export function parseClaims(tokenResult: IdTokenResult | null): ParsedClaims {
  if (!tokenResult?.claims) {
    return { role: "customer", merchantId: null };
  }

  const claims = tokenResult.claims;
  const role = (typeof claims.role === "string" ? claims.role : "customer") as UserRole;
  const merchantId = typeof claims.merchantId === "string" ? claims.merchantId : null;

  return { role, merchantId };
}

/**
 * Checks whether the given role has kitchen dashboard access.
 */
export function canAccessKitchen(role: UserRole): boolean {
  return role === "merchant_staff" || role === "super_admin";
}

/**
 * Checks whether the given role has driver dashboard access.
 */
export function canAccessDriverDashboard(role: UserRole): boolean {
  return role === "rider" || role === "super_admin";
}

/**
 * Checks whether the given role has admin panel access.
 */
export function canAccessAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "support_agent";
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
