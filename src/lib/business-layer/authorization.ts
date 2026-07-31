/**
 * Version 3 - Extended Business Layer: Authorization Core
 * Module M1.1 Implementation Contract
 * 
 * Centralized authorization logic. No component should implement auth checks independently.
 * Follows "Authorization Before Disclosure" principle (Security Spec §3.3).
 */

import { UserContext, AuthorizationResult, ResourceType } from './types';

/**
 * Validates if a user can access a specific resource type.
 * Returns detailed result for audit logging.
 */
export function authorizeResourceAccess(
  user: UserContext,
  resourceType: ResourceType,
  targetBranchId?: string
): AuthorizationResult {
  // Fail secure: deny by default
  if (!user || !user.role) {
    return { allowed: false, reason: 'Invalid user context' };
  }

  switch (user.role) {
    case 'PLATFORM_OWNER':
      return authorizePlatformOwner(resourceType, targetBranchId);
    
    case 'HOTEL_ADMIN':
      return authorizeHotelAdmin(user, resourceType, targetBranchId);
    
    case 'SUPPORT_PERSONNEL':
      return authorizeSupportPersonnel(user, resourceType, targetBranchId);
    
    case 'KITCHEN_STAFF':
    case 'DELIVERY_PERSONNEL':
    case 'CUSTOMER':
      return authorizeOperationalRole(user, resourceType, targetBranchId);
    
    default:
      return { allowed: false, reason: 'Unknown role' };
  }
}

function authorizePlatformOwner(
  resourceType: ResourceType,
  targetBranchId?: string
): AuthorizationResult {
  // Platform Owner has broad access, but we still validate resource types
  const allowedResources: ResourceType[] = [
    'BRANCH_PERFORMANCE',
    'CROSS_BRANCH_COMPARISON',
    'ORDERING_INSIGHT',
    'OPERATIONAL_FAILURE',
    'ALERT_NOTIFICATION',
    'PLATFORM_HEALTH',
    'DOCUMENTATION_CONSISTENCY',
    'INDEPENDENT_VERIFICATION',
    'BRANCH_DATA'
  ];

  if (!allowedResources.includes(resourceType)) {
    return { allowed: false, reason: 'Resource type not accessible' };
  }

  return { 
    allowed: true, 
    branchScope: ['*'] // Platform-wide access
  };
}

function authorizeHotelAdmin(
  user: UserContext,
  resourceType: ResourceType,
  targetBranchId?: string
): AuthorizationResult {
  // Hotel Admin is strictly scoped to their own branches
  const allowedResources: ResourceType[] = [
    'BRANCH_PERFORMANCE',
    'ORDERING_INSIGHT',
    'OPERATIONAL_FAILURE', // Receive alerts for own branch
    'BRANCH_DATA'
  ];

  if (!allowedResources.includes(resourceType)) {
    return { 
      allowed: false, 
      reason: `Hotel Admin cannot access ${resourceType}` 
    };
  }

  // Cross-branch comparison is explicitly forbidden for Hotel Admin
  if (resourceType === 'CROSS_BRANCH_COMPARISON') {
    return { allowed: false, reason: 'Cross-branch comparison restricted to Platform Owner' };
  }

  // Validate branch scope
  if (targetBranchId && !user.branchIds.includes(targetBranchId)) {
    return { 
      allowed: false, 
      reason: 'Branch ID not in user scope' 
    };
  }

  return { 
    allowed: true, 
    branchScope: user.branchIds 
  };
}

function authorizeSupportPersonnel(
  user: UserContext,
  resourceType: ResourceType,
  targetBranchId?: string
): AuthorizationResult {
  // Support Personnel have limited access based on designation
  if (!user.isDesignatedSupport) {
    return { allowed: false, reason: 'Support personnel not designated for platform access' };
  }

  // Can view platform health and governance records (review only)
  const allowedResources: ResourceType[] = [
    'PLATFORM_HEALTH',
    'DOCUMENTATION_CONSISTENCY',
    'INDEPENDENT_VERIFICATION'
  ];

  if (!allowedResources.includes(resourceType)) {
    return { 
      allowed: false, 
      reason: `Support personnel cannot access ${resourceType}` 
    };
  }

  return { 
    allowed: true, 
    branchScope: ['*'] // Platform-wide for allowed resources
  };
}

function authorizeOperationalRole(
  user: UserContext,
  resourceType: ResourceType,
  targetBranchId?: string
): AuthorizationResult {
  // Kitchen, Delivery, Customer have very limited access
  const allowedResources: ResourceType[] = ['BRANCH_DATA'];
  
  // Specific allowances based on role
  if (user.role === 'KITCHEN_STAFF' || user.role === 'DELIVERY_PERSONNEL') {
    // Can view operational tasks within their branch
    if (targetBranchId && user.branchIds.includes(targetBranchId)) {
      return { allowed: true, branchScope: user.branchIds };
    }
    return { allowed: false, reason: 'Branch mismatch' };
  }

  if (user.role === 'CUSTOMER') {
    // Customers can only see their own orders/data (handled at data layer)
    return { allowed: true, branchScope: [] };
  }

  return { allowed: false, reason: 'Role not authorized for this resource' };
}

/**
 * Validates branch scoping for multi-tenant isolation.
 * Ensures no user can access data outside their authorized branches.
 * Exception: Platform Owner for cross-branch features.
 */
export function validateBranchScope(
  user: UserContext,
  requestedBranchIds: string[],
  isCrossBranchFeature: boolean = false
): AuthorizationResult {
  if (user.role === 'PLATFORM_OWNER') {
    // Platform Owner can access multiple branches for cross-branch features
    if (isCrossBranchFeature) {
      return { allowed: true, branchScope: requestedBranchIds };
    }
    // Even Platform Owner must specify branches for non-cross-branch features
    return { allowed: true, branchScope: requestedBranchIds };
  }

  // All other roles are strictly single-tenant (or their assigned branches)
  const unauthorizedBranches = requestedBranchIds.filter(
    id => !user.branchIds.includes(id)
  );

  if (unauthorizedBranches.length > 0) {
    return { 
      allowed: false, 
      reason: `Access denied to branches: ${unauthorizedBranches.join(', ')}` 
    };
  }

  return { allowed: true, branchScope: requestedBranchIds };
}
