// ============================================================
// GET /api/v1/hotel/analytics/operational
// Module 5A — Operational Insights for Hotel Admin
// Computes Active Menu Items, Out of stock, and Active Staff
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
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

    // 1. Menu Item Availability
    const menuSnap = await db.collection(`merchants/${targetMerchantId}/menus`).get();
    let totalItems = 0;
    let availableItems = 0;
    let outOfStockItems = 0;

    menuSnap.forEach(doc => {
      totalItems++;
      if (doc.data().isAvailable) availableItems++;
      else outOfStockItems++;
    });

    // 2. Active Kitchen Staff Count
    const staffSnap = await db.collection("roleAssignments")
      .where("merchantId", "==", targetMerchantId)
      .where("merchant_staff", "==", true)
      .count()
      .get();
      
    const activeStaffCount = staffSnap.data().count;

    return NextResponse.json({
      totalItems,
      availableItems,
      outOfStockItems,
      activeStaffCount
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
