// ============================================================
// POST /api/v1/promotions/coupons/validate
// Module 14 — Advisory coupon validation
// NEVER mutates state — read-only evaluation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getCoupon, getUserRedemptionCount } from "@/lib/promotions/CouponRepository";
import { validateCoupon } from "@/lib/promotions/validateCoupon";
import { checkMargin } from "@/lib/promotions/MarginGuard";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const body = (await request.json()) as {
      couponCode: string;
      merchantId: string;
      items: Array<{ itemId: string; qty: number }>;
    };

    const { couponCode, merchantId, items } = body;

    if (!couponCode || !merchantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "couponCode, merchantId, and items are required" },
        { status: 400 }
      );
    }

    const { getFirestore } = await import("firebase-admin/firestore");
    const { getAdminApp } = await import("@/lib/firebaseAdmin");
    getAdminApp();
    const db = getFirestore();

    const merchantSnap = await db.collection("merchants").doc(merchantId).get();
    if (!merchantSnap.exists) {
      return NextResponse.json({ valid: false, reason: "Merchant not found" });
    }
    const merchantData = merchantSnap.data()!;

    // Compute subtotal securely
    let computedSubTotal = 0;
    const menuRef = db.collection("merchants").doc(merchantId).collection("menus");
    const itemPromises = items.map(i => menuRef.doc(i.itemId).get());
    const itemDocs = await Promise.all(itemPromises);

    for (let i = 0; i < items.length; i++) {
      const docSnap = itemDocs[i];
      if (docSnap.exists) {
        const data = docSnap.data()!;
        if (data.isAvailable) {
          computedSubTotal += data.ourPrice * (items[i].qty || 1);
        }
      }
    }

    // Load coupon from database
    const coupon = await getCoupon(couponCode);
    if (!coupon) {
      return NextResponse.json({ valid: false, reason: "Coupon not found" });
    }

    // Check merchant scope: null = platform-wide, otherwise must match
    if (coupon.merchantId !== null && coupon.merchantId !== merchantId) {
      return NextResponse.json({ valid: false, reason: "Coupon is not valid for this merchant" });
    }

    // Get user's redemption count for this coupon
    const userRedemptionCount = await getUserRedemptionCount(user.uid, couponCode);

    // Run coupon validation (PURE function)
    const couponValidation = validateCoupon(
      {
        isActive: coupon.isActive,
        discountPercent: coupon.discountPercent,
        expiresAt: coupon.expiresAt,
        maxUsesTotal: coupon.maxUsesTotal,
        maxUsesPerUser: coupon.maxUsesPerUser,
        usesCount: coupon.usesCount,
      },
      userRedemptionCount
    );

    if (!couponValidation.valid) {
      return NextResponse.json({
        valid: false,
        reason: couponValidation.reason,
      });
    }

        // Run margin guard (PURE function)
    const marginCheck = checkMargin({
      hotelShare: computedSubTotal * 0.7,
      discountPercent: couponValidation.discountPercent ?? 0,
      minimumProfitFloor: merchantData.minimumProfitFloor || 0,
    });

    if (!marginCheck.allowed) {
      return NextResponse.json({
        valid: false,
        reason: marginCheck.reason,
        projectedHotelShare: marginCheck.projectedHotelShare,
      });
    }

    return NextResponse.json({
      valid: true,
      discountPercent: couponValidation.discountPercent,
      projectedHotelShare: marginCheck.projectedHotelShare,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}
