// ============================================================
// API VERSION MIDDLEWARE — Gangaram
// Module 9 — Validates API version headers on incoming requests
// ============================================================

import { NextRequest } from "next/server";

export interface ApiVersionInfo {
  version: string;
  isDeprecated: boolean;
  deprecationMessage: string | null;
  sunsetDate: string | null;
}

const SUPPORTED_VERSIONS = ["1"] as const;
const CURRENT_VERSION = "1";

/**
 * Validates the Accept-Version header on an incoming request.
 *
 * Returns an ApiVersionInfo with deprecation warnings if applicable.
 * If the version is unsupported, throws an error.
 */
export function validateApiVersion(request: NextRequest): ApiVersionInfo {
  const versionHeader = request.headers.get("Accept-Version") || CURRENT_VERSION;
  const version = versionHeader.trim();

  if (!SUPPORTED_VERSIONS.includes(version as typeof SUPPORTED_VERSIONS[number])) {
    throw new Error(
      `Unsupported API version '${version}'. Supported versions: ${SUPPORTED_VERSIONS.join(", ")}`
    );
  }

  return {
    version,
    isDeprecated: false,
    deprecationMessage: null,
    sunsetDate: null,
  };
}

/**
 * Adds API version headers to a response.
 */
export function addApiVersionHeaders(
  headers: Record<string, string>,
  info: ApiVersionInfo
): void {
  headers["X-API-Version"] = info.version;

  if (info.isDeprecated) {
    headers["X-API-Deprecated"] = "true";
    if (info.deprecationMessage) {
      headers["X-API-Deprecation-Message"] = info.deprecationMessage;
    }
    if (info.sunsetDate) {
      headers["Sunset"] = info.sunsetDate;
    }
  }
}
