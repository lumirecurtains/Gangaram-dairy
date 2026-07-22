// ============================================================
// POST /api/v1/promotions/coupons — Coupon CRUD (Admin)
// Module 14 — Administrative management of coupon documents
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { upsertCoupon, deleteCoupon, getCoupon } from "@/lib/promotions/CouponRepository";
import { writeAuditLog } from "@/lib/admin/auditLogger";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = (await request.json()) as {
      action: "create" | "update" | "delete";
      couponCode: string;
      merchantId?: string | null;
      discountPercent?: number;
      maxUsesTotal?: number;
      maxUsesPerUser?: number;
      expiresAt?: number; // epoch ms
      isActive?: boolean;
    };

    const { action, couponCode } = body;

    if (!action || !couponCode) {
      return NextResponse.json({ error: "action and couponCode are required" }, { status: 400 });
    }

    if (action === "delete") {
      const existing = await getCoupon(couponCode);
      if (!existing) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      }

      await deleteCoupon(couponCode);

      await writeAuditLog({
        actorUid: admin.uid,
        action: "coupon.delete",
        targetPath: `coupons/${couponCode}`,
        beforeState: { discountPercent: existing.discountPercent },
        afterState: null,
      });

      return NextResponse.json({ success: true, action: "delete", couponCode });
    }

    // Create or update
    if (body.discountPercent === undefined || body.maxUsesTotal === undefined || body.maxUsesPerUser === undefined || body.expiresAt === undefined) {
      return NextResponse.json(
        { error: "discountPercent, maxUsesTotal, maxUsesPerUser, and expiresAt are required for create/update" },
        { status: 400 }
      );
    }

    const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
    const { getAdminApp } = await import("@/lib/firebaseAdmin");
    getAdminApp();
    const db = getFirestore();

    await upsertCoupon(couponCode, {
      merchantId: body.merchantId ?? null,
      discountPercent: body.discountPercent,
      maxUsesTotal: body.maxUsesTotal,
      maxUsesPerUser: body.maxUsesPerUser,
      isActive: body.isActive ?? true,
      expiresAt: Timestamp.fromMillis(body.expiresAt),
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: `coupon.${action}`,
      targetPath: `coupons/${couponCode}`,
      beforeState: null,
      afterState: {
        merchantId: body.merchantId ?? null,
        discountPercent: body.discountPercent,
        maxUsesTotal: body.maxUsesTotal,
        maxUsesPerUser: body.maxUsesPerUser,
      },
    });

    return NextResponse.json({ success: true, action, couponCode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
