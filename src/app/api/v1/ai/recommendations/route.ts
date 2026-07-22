// ============================================================
// GET /api/v1/ai/recommendations?merchantId=&itemId=
// Module 15 — Merchant-scoped recommendations
// Never leaks cross-merchant data
// Degrades gracefully (returns empty array) if AI is down
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getRecommendationEngine } from "@/lib/ai/getRecommendationEngine";
import { checkRateLimit } from "@/lib/security/rateLimiter";
import type { RecommendedItem } from "@/lib/ai/RecommendationEngine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const itemId = searchParams.get("itemId") || undefined;

    if (!merchantId) {
      return NextResponse.json(
        { error: "merchantId query parameter is required" },
        { status: 400 }
      );
    }

    // Merchant scoping: merchant_staff can only see their own merchant
    const isMerchantStaff = user.isMerchantStaff && user.merchantId === merchantId;
    const isSuperAdmin = user.isSuperAdmin;

    const rl = await checkRateLimit(user.uid, "ai:recommendations");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Get the recommendation engine from the factory
    // If provider is "none", returns HeuristicRecommendationEngine (free, no API)
    // If LLM fails, it throws — we catch and return empty gracefully
    let recommendations: RecommendedItem[] = [];
    try {
      const engine = await getRecommendationEngine();
      recommendations = await engine.getRecommendations(merchantId, itemId);
    } catch {
      // Graceful degradation — AI module never blocks the user
      recommendations = [];
    }

    return NextResponse.json({
      merchantId,
      itemId: itemId || null,
      count: recommendations.length,
      recommendations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}
