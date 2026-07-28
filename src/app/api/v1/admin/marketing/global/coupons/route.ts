// ============================================================
// GET & POST /api/v1/admin/marketing/global/coupons
// Module 6 — Global Coupon Engine
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { upsertCoupon, getCoupon, deleteCoupon } from "@/lib/promotions/CouponRepository";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context") || "admin";
    
    if (context === "admin") {
      await requireSuperAdmin(request);
    }

    getAdminApp();
    const db = getFirestore();

    // Fetch global coupons explicitly
    const snapshot = await db.collection("coupons").where("merchantId", "==", null).get();
    const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ coupons });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    
    const body = await request.json();
    const { action, couponCode } = body;

    if (!action || !couponCode) {
      return NextResponse.json({ error: "action and couponCode are required" }, { status: 400 });
    }

    if (action === "update" || action === "delete") {
      const existing = await getCoupon(couponCode);
      if (!existing) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      if (existing.merchantId !== null) {
        return NextResponse.json({ error: "Forbidden: Attempting to modify a merchant-specific coupon from global endpoint" }, { status: 403 });
      }
    }

    if (action === "delete") {
      await deleteCoupon(couponCode);
      return NextResponse.json({ success: true, action: "delete" });
    }

    if (body.discountPercent === undefined || body.maxUsesTotal === undefined || body.maxUsesPerUser === undefined || body.expiresAt === undefined) {
      return NextResponse.json(
        { error: "discountPercent, maxUsesTotal, maxUsesPerUser, and expiresAt are required for create/update" },
        { status: 400 }
      );
    }

    await upsertCoupon(couponCode.toUpperCase(), {
      merchantId: null, // Explicitly global
      discountPercent: body.discountPercent,
      maxUsesTotal: body.maxUsesTotal,
      maxUsesPerUser: body.maxUsesPerUser,
      isActive: body.isActive ?? true,
      expiresAt: Timestamp.fromMillis(body.expiresAt),
      scope: body.scope || "global",
      targetProductIds: Array.isArray(body.targetProductIds) ? body.targetProductIds : [],
      targetCategories: Array.isArray(body.targetCategories) ? body.targetCategories : [],
      comboProductIds: Array.isArray(body.comboProductIds) ? body.comboProductIds : [],
      timeWindowStart: body.timeWindowStart || null,
      timeWindowEnd: body.timeWindowEnd || null,
    });

    return NextResponse.json({ success: true, action, couponCode: couponCode.toUpperCase() });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
