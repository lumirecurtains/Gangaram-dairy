// ============================================================
// GET /api/v1/analytics/platform?from=&to=
// Module 13 — Platform analytics (super_admin only)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { getPlatformMetrics } from "@/lib/analytics/AnalyticsRepository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to query parameters are required (format: yyyy-mm-dd)" },
        { status: 400 }
      );
    }

    const result = await getPlatformMetrics(from, to);

    return NextResponse.json({
      from,
      to,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
