// ============================================================
// DEPRECATION REGISTRY — Gangaram
// Module 9 — Tracks deprecated API versions and routes
// ============================================================

export interface DeprecationEntry {
  route: string;
  deprecatedVersion: string;
  deprecationDate: string;
  sunsetDate: string;
  migrationGuide: string | null;
  reason: string;
}

/**
 * Registry of deprecated API routes and versions.
 * When a route is deprecated, middleware checks this registry
 * and attaches deprecation warnings to responses.
 */
const deprecationRegistry: Map<string, DeprecationEntry> = new Map();

/**
 * Registers a route as deprecated.
 * Once registered, responses to that route will include
 * deprecation warning headers.
 */
export function registerDeprecation(entry: DeprecationEntry): void {
  deprecationRegistry.set(entry.route, entry);
}

/**
 * Looks up a route in the deprecation registry.
 * Returns the deprecation entry if found, or null if the route is active.
 */
export function getDeprecationInfo(route: string): DeprecationEntry | null {
  // Check exact match
  if (deprecationRegistry.has(route)) {
    return deprecationRegistry.get(route)!;
  }

  // Check wildcard prefix match (e.g. /api/v0/*)
  for (const [pattern, entry] of deprecationRegistry.entries()) {
    if (pattern.endsWith("/*") && route.startsWith(pattern.slice(0, -1))) {
      return entry;
    }
  }

  return null;
}

/**
 * Returns the full deprecation registry (for admin inspection).
 */
export function getAllDeprecations(): DeprecationEntry[] {
  return Array.from(deprecationRegistry.values());
}
