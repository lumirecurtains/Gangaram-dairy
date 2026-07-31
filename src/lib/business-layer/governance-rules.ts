/**
 * Version 3 - Extended Business Layer: Governance Rules
 * Module M1.1 Implementation Contract
 * 
 * Defines access rules for Module D (Governance Maturity) features.
 * Controls access to Documentation Consistency and Independent Verification records.
 */

import { UserContext, AuthorizationResult, GovernancePermission } from './types';

/**
 * Determines governance permissions for a user.
 * Only Platform Owner and designated stewards can access governance records.
 */
export function getGovernancePermissions(user: UserContext): GovernancePermission {
  const defaultPermissions: GovernancePermission = {
    canViewConsistencyRecords: false,
    canViewVerificationRecords: false,
    canInitiateConsistencyCheck: false,
    canInitiateVerification: false
  };

  if (!user || !user.role) {
    return defaultPermissions;
  }

  // Platform Owner has full governance access
  if (user.role === 'PLATFORM_OWNER') {
    return {
      canViewConsistencyRecords: true,
      canViewVerificationRecords: true,
      canInitiateConsistencyCheck: true,
      canInitiateVerification: true
    };
  }

  // Support Personnel (designated) can view but not initiate
  if (user.role === 'SUPPORT_PERSONNEL' && user.isDesignatedSupport) {
    return {
      canViewConsistencyRecords: true,
      canViewVerificationRecords: true,
      canInitiateConsistencyCheck: false,
      canInitiateVerification: false
    };
  }

  // All other roles have no governance access
  return defaultPermissions;
}

/**
 * Validates if a user can view documentation consistency records.
 */
export function canViewConsistencyRecords(user: UserContext): AuthorizationResult {
  const permissions = getGovernancePermissions(user);
  
  if (permissions.canViewConsistencyRecords) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: 'User not authorized to view consistency records' 
  };
}

/**
 * Validates if a user can view independent verification records.
 */
export function canViewVerificationRecords(user: UserContext): AuthorizationResult {
  const permissions = getGovernancePermissions(user);
  
  if (permissions.canViewVerificationRecords) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: 'User not authorized to view verification records' 
  };
}

/**
 * Validates if a user can initiate a consistency check.
 * This is a privileged action restricted to Platform Owner.
 */
export function canInitiateConsistencyCheck(user: UserContext): AuthorizationResult {
  const permissions = getGovernancePermissions(user);
  
  if (permissions.canInitiateConsistencyCheck) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: 'User not authorized to initiate consistency checks' 
  };
}

/**
 * Validates if a user can initiate an independent verification.
 * This is a privileged action restricted to Platform Owner.
 */
export function canInitiateVerification(user: UserContext): AuthorizationResult {
  const permissions = getGovernancePermissions(user);
  
  if (permissions.canInitiateVerification) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: 'User not authorized to initiate verification' 
  };
}

/**
 * Enforces separation of duty: verifier cannot be the same as claimant.
 * Returns true if the verifier is distinct from the claimant.
 */
export function verifySeparationOfDuty(
  claimantUid: string,
  verifierUid: string
): boolean {
  if (!claimantUid || !verifierUid) {
    return false;
  }
  return claimantUid !== verifierUid;
}
