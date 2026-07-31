/**
 * Version 3 - Extended Business Layer: Failure Responsibility Mapping
 * Module M1.1 Implementation Contract
 * 
 * Maps operational failure classes to responsible roles.
 * Supports Module B (Operational Reliability) alert routing.
 */

import { UserRole, FailureClassDefinition } from './types';

/**
 * Registry of qualifying operational failure classes.
 * Defined here as the single source of truth (Architecture Spec §5.9).
 */
const FAILURE_REGISTRY: Record<string, FailureClassDefinition> = {
  ORDER_PROCESSING_FAILED: {
    id: 'ORDER_PROCESSING_FAILED',
    name: 'Order Processing Failure',
    scope: 'BRANCH',
    responsibleRole: 'HOTEL_ADMIN',
    description: 'Order failed to process correctly in the branch workflow'
  },
  KITCHEN_WORKFLOW_DISRUPTED: {
    id: 'KITCHEN_WORKFLOW_DISRUPTED',
    name: 'Kitchen Workflow Disruption',
    scope: 'BRANCH',
    responsibleRole: 'HOTEL_ADMIN',
    description: 'Kitchen operations unable to proceed normally'
  },
  DELIVERY_ASSIGNMENT_FAILED: {
    id: 'DELIVERY_ASSIGNMENT_FAILED',
    name: 'Delivery Assignment Failure',
    scope: 'BRANCH',
    responsibleRole: 'HOTEL_ADMIN',
    description: 'Unable to assign delivery personnel to completed order'
  },
  PAYMENT_PROCESSING_ERROR: {
    id: 'PAYMENT_PROCESSING_ERROR',
    name: 'Payment Processing Error',
    scope: 'BRANCH',
    responsibleRole: 'HOTEL_ADMIN',
    description: 'Payment gateway or reconciliation error'
  },
  PLATFORM_SERVICE_OUTAGE: {
    id: 'PLATFORM_SERVICE_OUTAGE',
    name: 'Platform Service Outage',
    scope: 'PLATFORM',
    responsibleRole: 'PLATFORM_OWNER',
    description: 'Core platform service unavailable'
  },
  ALERTING_MECHANISM_FAILURE: {
    id: 'ALERTING_MECHANISM_FAILURE',
    name: 'Alerting Mechanism Failure',
    scope: 'PLATFORM',
    responsibleRole: 'PLATFORM_OWNER',
    description: 'The alerting system itself failed to notify responsible party'
  },
  DATABASE_CONNECTION_LOST: {
    id: 'DATABASE_CONNECTION_LOST',
    name: 'Database Connection Lost',
    scope: 'PLATFORM',
    responsibleRole: 'PLATFORM_OWNER',
    description: 'Loss of database connectivity affecting multiple branches'
  }
};

/**
 * Retrieves the definition for a failure class.
 * Returns undefined if class is not recognized (non-qualifying).
 */
export function getFailureClass(failureId: string): FailureClassDefinition | undefined {
  return FAILURE_REGISTRY[failureId];
}

/**
 * Determines the responsible role for a given failure class.
 * Used by Module B to route alerts correctly.
 */
export function getResponsibleRoleForFailure(failureId: string): UserRole | null {
  const failureClass = FAILURE_REGISTRY[failureId];
  if (!failureClass) {
    return null;
  }
  return failureClass.responsibleRole;
}

/**
 * Determines if a failure is branch-scoped or platform-scoped.
 */
export function getFailureScope(failureId: string): 'BRANCH' | 'PLATFORM' | null {
  const failureClass = FAILURE_REGISTRY[failureId];
  if (!failureClass) {
    return null;
  }
  return failureClass.scope;
}

/**
 * Validates if a failure class is "qualifying" (actionable).
 * Only qualifying failures should trigger alerts (prevents alert fatigue).
 */
export function isQualifyingFailure(failureId: string): boolean {
  return FAILURE_REGISTRY.hasOwnProperty(failureId);
}

/**
 * Returns all registered failure classes.
 * For governance review and documentation.
 */
export function getAllFailureClasses(): FailureClassDefinition[] {
  return Object.values(FAILURE_REGISTRY);
}
