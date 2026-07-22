// ============================================================
// GET DISPATCHER FACTORY — Gangaram
// Module 10 — Factory that returns a NotificationDispatcher
// One-line change to swap implementations in the future
// ============================================================

import type { NotificationDispatcher } from "./NotificationDispatcher";
import { SynchronousRetryDispatcher } from "./SynchronousRetryDispatcher";

let cachedDispatcher: NotificationDispatcher | null = null;

/**
 * Returns the active NotificationDispatcher implementation.
 *
 * Current implementation: SynchronousRetryDispatcher (3 attempts)
 *
 * To switch to an external queue in the future (Module 12+), change
 * this factory to return QueueDispatcher or similar — one line change.
 */
export function getDispatcher(): NotificationDispatcher {
  if (!cachedDispatcher) {
    cachedDispatcher = new SynchronousRetryDispatcher(3);
  }
  return cachedDispatcher;
}

/**
 * For testing: resets the cached dispatcher so the next call
 * to getDispatcher() creates a fresh instance.
 */
export function resetDispatcher(): void {
  cachedDispatcher = null;
}
