// ============================================================
// GET /api/v1/promotions/loyalty — Self-scoped loyalty wallet
// Module 14 — Fetches /loyaltyAccounts/{userId}
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getLoyaltyAccount } from "@/lib/promotions/loyaltyAccrual";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const account = await getLoyaltyAccount(user.uid);

    return NextResponse.json({
      userId: user.uid,
      ...account,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}
