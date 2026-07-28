// ============================================================
// GET & POST /api/v1/hotel/coupons
// Module 5B — Hotel Admin Coupon Management Foundation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { upsertCoupon, getCoupon, deleteCoupon } from "@/lib/promotions/CouponRepository";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    // Authorization
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetMerchantId = searchParams.get("merchantId") || user.merchantId;

    if (!targetMerchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch access denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();

    const snapshot = await db.collection("coupons").where("merchantId", "==", targetMerchantId).get();
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
    const user = await verifyAuth(request);
    
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const targetMerchantId = body.merchantId || user.merchantId;
    const { action, couponCode } = body;

    if (!targetMerchantId || !action || !couponCode) {
      return NextResponse.json({ error: "merchantId, action, and couponCode are required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch modification denied" }, { status: 403 });
    }

    // Branch Isolation Verification
    if (action === "update" || action === "delete") {
      const existing = await getCoupon(couponCode);
      if (!existing) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      if (existing.merchantId !== targetMerchantId) {
        return NextResponse.json({ error: "Forbidden: Coupon belongs to another branch or is global" }, { status: 403 });
      }
    }

    if (action === "delete") {
      await deleteCoupon(couponCode);
      return NextResponse.json({ success: true, action: "delete" });
    }

    // Create or update
    if (body.discountPercent === undefined || body.maxUsesTotal === undefined || body.maxUsesPerUser === undefined || body.expiresAt === undefined) {
      return NextResponse.json(
        { error: "discountPercent, maxUsesTotal, maxUsesPerUser, and expiresAt are required for create/update" },
        { status: 400 }
      );
    }

    await upsertCoupon(couponCode.toUpperCase(), {
      merchantId: targetMerchantId, // Explicitly scope it to this hotel
      discountPercent: body.discountPercent,
      maxUsesTotal: body.maxUsesTotal,
      maxUsesPerUser: body.maxUsesPerUser,
      isActive: body.isActive ?? true,
      expiresAt: Timestamp.fromMillis(body.expiresAt),
      // Version 2 Smart Coupon Extensions
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
