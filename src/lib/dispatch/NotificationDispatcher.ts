// ============================================================
// NOTIFICATION DISPATCHER INTERFACE — Gangaram
// Module 10 — Defines the contract for all dispatcher implementations
// ============================================================

import type { DispatchJob, DispatchResult } from "./types";

/**
 * Interface for dispatching notification jobs to various channels.
 *
 * Implementations can be:
 * - SynchronousRetryDispatcher (default, built-in)
 * - External message queue adapter (future, Module 12)
 */
export interface NotificationDispatcher {
  /**
   * Dispatch a single job. Returns a DispatchResult indicating
   * success or failure. Should never throw — capture errors internally.
   */
  dispatch(job: DispatchJob): Promise<DispatchResult>;

  /**
   * Dispatch multiple jobs concurrently. Returns an array of results.
   */
  dispatchAll(jobs: DispatchJob[]): Promise<DispatchResult[]>;
}
