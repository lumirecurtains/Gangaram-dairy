/**
 * Version 3 - Extended Business Layer
 * Module M1.1 Implementation Contract
 * 
 * Public API for the Extended Business Layer.
 * All authorization, tenant isolation, and business rule decisions flow through this module.
 * 
 * Architecture Spec §5.9: This is the sole decision point for business rules.
 */

export type {
  // Types
  UserRole,
  UserContext,
  AuthorizationResult,
  FailureClassDefinition,
  GovernancePermission,
  ResourceType,
} from './types';

export {
  // Authorization Core
  authorizeResourceAccess,
  validateBranchScope,
} from './authorization';

export {
  // Tenant Isolation
  enforceTenantIsolation,
  filterAuthorizedBranches,
  getSafeQueryScope,
} from './tenant-rules';

export {
  // Failure Mapping (Module B support)
  getFailureClass,
  getResponsibleRoleForFailure,
  getFailureScope,
  isQualifyingFailure,
  getAllFailureClasses,
} from './failure-mapping';

export {
  // Governance Rules (Module D support)
  getGovernancePermissions,
  canViewConsistencyRecords,
  canViewVerificationRecords,
  canInitiateConsistencyCheck,
  canInitiateVerification,
  verifySeparationOfDuty,
} from './governance-rules';
