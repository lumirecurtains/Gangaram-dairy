// ============================================================
// DISPATCH TYPES — Gangaram Scalability Layer
// Module 10 — Job type definitions for the dispatcher pattern
// ============================================================

/**
 * Supported dispatch job types.
 */
export type JobType = "whatsapp_notify" | "sms_notify" | "push_notify" | "in_app_notify";

/**
 * Generic job payload — carries the data needed by a channel sender.
 */
export interface JobPayload {
  [key: string]: unknown;
  orderId?: string;
  merchantId?: string;
  userId?: string;
  message?: string;
}

/**
 * Result returned after attempting to dispatch a job.
 */
export interface DispatchResult {
  success: boolean;
  jobId: string;
  jobType: JobType;
  attempts: number;
  lastError: string | null;
}

/**
 * A dispatch job — combination of type and payload.
 */
export interface DispatchJob {
  id: string;
  type: JobType;
  payload: JobPayload;
}
