// ============================================================
// WITH RETRY HELPER — Gangaram Notifications
// Module 12 — Shared retry logic: 3 attempts per channel
// Exponential backoff: 500ms, 2s
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an async operation with up to `maxAttempts` retries.
 * Uses exponential backoff: 500ms between 1st→2nd, 2s between 2nd→3rd.
 * Never throws — returns { success, result, lastError, attempts }.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<{
  success: boolean;
  result: T | null;
  attempts: number;
  lastError: string | null;
}> {
  let lastError: string | null = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;

    try {
      const result = await fn();
      return { success: true, result, attempts, lastError: null };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < maxAttempts) {
      const delay = attempt === 1 ? 500 : 2000;
      await sleep(delay);
    }
  }

  return { success: false, result: null, attempts, lastError };
}
