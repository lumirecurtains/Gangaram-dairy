/**
 * Version 3 - Extended Business Layer: Failure Mapping Tests
 * Module M1.1 Implementation Contract Verification
 */

import { describe, it, expect } from 'vitest';
import {
  getFailureClass,
  getResponsibleRoleForFailure,
  getFailureScope,
  isQualifyingFailure,
  getAllFailureClasses
} from '../failure-mapping';

describe('Extended Business Layer - Failure Mapping', () => {
  
  describe('Failure Class Registry', () => {
    it('should return valid failure class for known ID', () => {
      const failure = getFailureClass('ORDER_PROCESSING_FAILED');
      expect(failure).toBeDefined();
      expect(failure?.id).toBe('ORDER_PROCESSING_FAILED');
      expect(failure?.scope).toBe('BRANCH');
      expect(failure?.responsibleRole).toBe('HOTEL_ADMIN');
    });

    it('should return undefined for unknown failure ID', () => {
      const failure = getFailureClass('UNKNOWN_FAILURE');
      expect(failure).toBeUndefined();
    });

    it('should identify branch-scoped failures correctly', () => {
      const scope = getFailureScope('KITCHEN_WORKFLOW_DISRUPTED');
      expect(scope).toBe('BRANCH');
    });

    it('should identify platform-scoped failures correctly', () => {
      const scope = getFailureScope('PLATFORM_SERVICE_OUTAGE');
      expect(scope).toBe('PLATFORM');
    });
  });

  describe('Responsibility Routing', () => {
    it('should route branch failures to Hotel Admin', () => {
      const role = getResponsibleRoleForFailure('DELIVERY_ASSIGNMENT_FAILED');
      expect(role).toBe('HOTEL_ADMIN');
    });

    it('should route platform failures to Platform Owner', () => {
      const role = getResponsibleRoleForFailure('DATABASE_CONNECTION_LOST');
      expect(role).toBe('PLATFORM_OWNER');
    });

    it('should return null for non-qualifying failures', () => {
      const role = getResponsibleRoleForFailure('NON_EXISTENT_FAILURE');
      expect(role).toBeNull();
    });
  });

  describe('Qualifying Failure Validation', () => {
    it('should return true for registered failure classes', () => {
      expect(isQualifyingFailure('ALERTING_MECHANISM_FAILURE')).toBe(true);
      expect(isQualifyingFailure('PAYMENT_PROCESSING_ERROR')).toBe(true);
    });

    it('should return false for unregistered failures', () => {
      expect(isQualifyingFailure('RANDOM_ERROR')).toBe(false);
      expect(isQualifyingFailure('')).toBe(false);
    });
  });

  describe('Alerting Mechanism Failure', () => {
    it('should treat alerting mechanism failure as a qualifying platform failure', () => {
      const failure = getFailureClass('ALERTING_MECHANISM_FAILURE');
      expect(failure).toBeDefined();
      expect(failure?.scope).toBe('PLATFORM');
      expect(failure?.responsibleRole).toBe('PLATFORM_OWNER');
    });
  });

  describe('Registry Completeness', () => {
    it('should return all registered failure classes', () => {
      const allFailures = getAllFailureClasses();
      expect(allFailures.length).toBeGreaterThan(0);
      
      // Verify each has required properties
      allFailures.forEach(failure => {
        expect(failure.id).toBeDefined();
        expect(failure.name).toBeDefined();
        expect(['BRANCH', 'PLATFORM']).toContain(failure.scope);
        expect(failure.responsibleRole).toBeDefined();
      });
    });
  });
});
