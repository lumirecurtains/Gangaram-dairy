/**
 * Version 3 - Extended Business Layer: Authorization Tests
 * Module M1.1 Implementation Contract Verification
 */

import { describe, it, expect } from 'vitest';
import { authorizeResourceAccess, validateBranchScope } from '../authorization';
import { UserContext, ResourceType } from '../types';

// Test fixtures
const platformOwner: UserContext = {
  uid: 'po-001',
  role: 'PLATFORM_OWNER',
  branchIds: [] // Platform owner doesn't need branch IDs
};

const hotelAdminA: UserContext = {
  uid: 'ha-001',
  role: 'HOTEL_ADMIN',
  branchIds: ['branch-a']
};

const hotelAdminB: UserContext = {
  uid: 'ha-002',
  role: 'HOTEL_ADMIN',
  branchIds: ['branch-b']
};

const designatedSupport: UserContext = {
  uid: 'sp-001',
  role: 'SUPPORT_PERSONNEL',
  branchIds: [],
  isDesignatedSupport: true
};

const kitchenStaff: UserContext = {
  uid: 'ks-001',
  role: 'KITCHEN_STAFF',
  branchIds: ['branch-a']
};

describe('Extended Business Layer - Authorization', () => {
  
  describe('Platform Owner Access', () => {
    it('should allow Platform Owner to access all resource types', () => {
      const resources: ResourceType[] = [
        'BRANCH_PERFORMANCE',
        'CROSS_BRANCH_COMPARISON',
        'ORDERING_INSIGHT',
        'PLATFORM_HEALTH'
      ];

      resources.forEach(resource => {
        const result = authorizeResourceAccess(platformOwner, resource);
        expect(result.allowed).toBe(true);
      });
    });

    it('should grant platform-wide scope to Platform Owner', () => {
      const result = authorizeResourceAccess(platformOwner, 'BRANCH_PERFORMANCE');
      expect(result.branchScope).toEqual(['*']);
    });
  });

  describe('Hotel Admin Isolation', () => {
    it('should allow Hotel Admin to access own branch performance', () => {
      const result = authorizeResourceAccess(hotelAdminA, 'BRANCH_PERFORMANCE', 'branch-a');
      expect(result.allowed).toBe(true);
      expect(result.branchScope).toContain('branch-a');
    });

    it('should deny Hotel Admin access to other branch data', () => {
      const result = authorizeResourceAccess(hotelAdminA, 'BRANCH_PERFORMANCE', 'branch-b');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Branch ID not in user scope');
    });

    it('should explicitly deny Hotel Admin access to cross-branch comparison', () => {
      const result = authorizeResourceAccess(hotelAdminA, 'CROSS_BRANCH_COMPARISON');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-branch comparison restricted');
    });

    it('should deny Hotel Admin access to platform health', () => {
      const result = authorizeResourceAccess(hotelAdminA, 'PLATFORM_HEALTH');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Support Personnel Access', () => {
    it('should allow designated support to view platform health', () => {
      const result = authorizeResourceAccess(designatedSupport, 'PLATFORM_HEALTH');
      expect(result.allowed).toBe(true);
    });

    it('should deny non-designated support access', () => {
      const nonDesignated: UserContext = {
        ...designatedSupport,
        isDesignatedSupport: false
      };
      const result = authorizeResourceAccess(nonDesignated, 'PLATFORM_HEALTH');
      expect(result.allowed).toBe(false);
    });

    it('should deny support personnel access to branch performance', () => {
      const result = authorizeResourceAccess(designatedSupport, 'BRANCH_PERFORMANCE');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Operational Roles', () => {
    it('should allow kitchen staff to access branch data within their branch', () => {
      const result = authorizeResourceAccess(kitchenStaff, 'BRANCH_DATA', 'branch-a');
      expect(result.allowed).toBe(true);
    });

    it('should deny kitchen staff access to other branches', () => {
      const result = authorizeResourceAccess(kitchenStaff, 'BRANCH_DATA', 'branch-b');
      expect(result.allowed).toBe(false);
    });

    it('should deny kitchen staff access to analytics', () => {
      const result = authorizeResourceAccess(kitchenStaff, 'BRANCH_PERFORMANCE');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should prevent Hotel Admin A from accessing Branch B', () => {
      const result = validateBranchScope(hotelAdminA, ['branch-b']);
      expect(result.allowed).toBe(false);
    });

    it('should allow Hotel Admin A to access Branch A', () => {
      const result = validateBranchScope(hotelAdminA, ['branch-a']);
      expect(result.allowed).toBe(true);
    });

    it('should allow Platform Owner to access multiple branches for cross-branch features', () => {
      const result = validateBranchScope(platformOwner, ['branch-a', 'branch-b'], true);
      expect(result.allowed).toBe(true);
      expect(result.branchScope).toEqual(['branch-a', 'branch-b']);
    });

    it('should fail secure with invalid user context', () => {
      const result = authorizeResourceAccess({} as UserContext, 'BRANCH_PERFORMANCE');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invalid user context');
    });
  });

  describe('Fail Secure Behavior', () => {
    it('should deny access with unknown role', () => {
      const unknownUser: UserContext = {
        uid: 'unknown',
        role: 'UNKNOWN_ROLE' as any,
        branchIds: []
      };
      const result = authorizeResourceAccess(unknownUser, 'BRANCH_PERFORMANCE');
      expect(result.allowed).toBe(false);
    });

    it('should not reveal resource existence on denial', () => {
      const result = authorizeResourceAccess(hotelAdminA, 'CROSS_BRANCH_COMPARISON');
      // Error message should be generic about permission, not about resource existence
      expect(result.reason).not.toContain('does not exist');
    });
  });
});
