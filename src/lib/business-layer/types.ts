/**
 * Version 3 - Extended Business Layer Types
 * Module M1.1 Implementation Contract
 * 
 * Defines strict types for roles, scopes, and authorization results.
 */

export type UserRole = 
  | 'PLATFORM_OWNER'
  | 'HOTEL_ADMIN'
  | 'KITCHEN_STAFF'
  | 'DELIVERY_PERSONNEL'
  | 'SUPPORT_PERSONNEL'
  | 'CUSTOMER';

export interface UserContext {
  uid: string;
  role: UserRole;
  branchIds: string[]; // Branches the user is authorized to access
  isDesignatedSupport?: boolean; // For Support Personnel with platform health access
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  branchScope?: string[];
}

export interface FailureClassDefinition {
  id: string;
  name: string;
  scope: 'BRANCH' | 'PLATFORM';
  responsibleRole: UserRole;
  description: string;
}

export interface GovernancePermission {
  canViewConsistencyRecords: boolean;
  canViewVerificationRecords: boolean;
  canInitiateConsistencyCheck: boolean;
  canInitiateVerification: boolean;
}

export type ResourceType = 
  | 'BRANCH_PERFORMANCE'
  | 'CROSS_BRANCH_COMPARISON'
  | 'ORDERING_INSIGHT'
  | 'OPERATIONAL_FAILURE'
  | 'ALERT_NOTIFICATION'
  | 'PLATFORM_HEALTH'
  | 'DOCUMENTATION_CONSISTENCY'
  | 'INDEPENDENT_VERIFICATION'
  | 'BRANCH_DATA';
