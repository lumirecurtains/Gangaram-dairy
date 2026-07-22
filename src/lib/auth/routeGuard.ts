// ============================================================
// ROUTE GUARD — Gangaram Client
// Module 8 — UX-only helper for client-side route protection
// ============================================================

import type { UserRole } from "./tokenClaimsHelper";
import { canAccessKitchen, canAccessDriverDashboard, canAccessAdmin } from "./tokenClaimsHelper";

export type ProtectedRoute =
  | "kitchen"
  | "driver"
  | "admin"
  | "profile"
  | "checkout";

/**
 * Checks whether a user with the given role can access a protected route.
 * This is a UX-level guard — server-side enforcement happens via verifyAuth.
 *
 * Returns an object with:
 * - allowed: boolean
 * - redirectTo: string | null (where to redirect if not allowed)
 */
export function checkRouteAccess(
  route: ProtectedRoute,
  role: UserRole,
  isAuthenticated: boolean
): { allowed: boolean; redirectTo: string | null } {
  if (!isAuthenticated) {
    if (route === "checkout") {
      return { allowed: false, redirectTo: "/login" };
    }
    return { allowed: false, redirectTo: "/login" };
  }

  switch (route) {
    case "kitchen":
      return canAccessKitchen(role)
        ? { allowed: true, redirectTo: null }
        : { allowed: false, redirectTo: "/" };

    case "driver":
      return canAccessDriverDashboard(role)
        ? { allowed: true, redirectTo: null }
        : { allowed: false, redirectTo: "/" };

    case "admin":
      return canAccessAdmin(role)
        ? { allowed: true, redirectTo: null }
        : { allowed: false, redirectTo: "/" };

    case "profile":
      return { allowed: true, redirectTo: null };

    case "checkout":
      return { allowed: true, redirectTo: null };

    default:
      return { allowed: false, redirectTo: "/" };
  }
}
