/**
 * Version 3 - Extended Business Layer: Tenant Isolation Rules
 * Module M1.1 Implementation Contract
 * 
 * Enforces multi-tenant isolation invariants (Vision Document §12 item 7).
 * Ensures no branch data leaks across tenant boundaries.
 */

import { UserContext, AuthorizationResult } from './types';

/**
 * Multi-tenant isolation invariant:
 * A user can only access data for branches explicitly assigned to them.
 * Exception: Platform Owner has global access.
 */
export function enforceTenantIsolation(
  user: UserContext,
  requestedBranchId: string
): AuthorizationResult {
  if (!user || !user.role) {
    return { allowed: false, reason: 'Invalid user context' };
  }

  // Platform Owner bypasses tenant isolation (global view)
  if (user.role === 'PLATFORM_OWNER') {
    return { allowed: true, branchScope: [requestedBranchId] };
  }

  // All other roles are strictly bound to their assigned branches
  const isAuthorized = user.branchIds.includes(requestedBranchId);

  if (!isAuthorized) {
    // Security: Do not reveal existence of unauthorized branches
    return { 
      allowed: false, 
      reason: 'Access denied' 
    };
  }

  return { 
    allowed: true, 
    branchScope: [requestedBranchId] 
  };
}

/**
 * Validates a list of branch IDs for bulk operations.
 * Used for filtering datasets before aggregation.
 */
export function filterAuthorizedBranches(
  user: UserContext,
  branchIds: string[]
): string[] {
  if (user.role === 'PLATFORM_OWNER') {
    return branchIds; // Platform Owner sees all
  }

  // Filter to only branches the user is assigned to
  return branchIds.filter(id => user.branchIds.includes(id));
}

/**
 * Ensures aggregation queries do not leak cross-tenant data.
 * Returns safe branch scope for database queries.
 */
export function getSafeQueryScope(
  user: UserContext,
  explicitBranchId?: string
): string[] | '*' {
  if (user.role === 'PLATFORM_OWNER') {
    return explicitBranchId ? [explicitBranchId] : '*';
  }

  // Hotel Admin and others: strictly limited to assigned branches
  if (explicitBranchId) {
    if (user.branchIds.includes(explicitBranchId)) {
      return [explicitBranchId];
    }
    return []; // Empty scope = no data returned
  }

  return user.branchIds;
}
