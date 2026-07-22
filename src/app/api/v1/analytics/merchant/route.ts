// ============================================================
// GET /api/v1/analytics/merchant?merchantId=&from=&to=
// Module 13 — Merchant analytics (token-scoped)
// Token.merchantId must match query param OR super_admin
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getMerchantDailyStats } from "@/lib/analytics/AnalyticsRepository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!merchantId || !from || !to) {
      return NextResponse.json(
        { error: "merchantId, from, and to query parameters are required" },
        { status: 400 }
      );
    }

    // Token-scoped verification: merchant_staff can only see their own merchant
    const isMerchantStaff =
      user.isMerchantStaff && user.merchantId === merchantId;
    const isSuperAdmin = user.isSuperAdmin;

    if (!isMerchantStaff && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getMerchantDailyStats(merchantId, from, to);

    return NextResponse.json({
      merchantId,
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
