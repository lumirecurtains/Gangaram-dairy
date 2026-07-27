// ============================================================
// GET /api/v1/hotel/reviews
// Module 5B — Hotel Admin Review Visibility
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    // Authorization
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetMerchantId = searchParams.get("merchantId") || user.merchantId;
    const statusFilter = searchParams.get("status");

    if (!targetMerchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch access denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();

    let q = db.collection("reviews").where("merchantId", "==", targetMerchantId);
    
    if (statusFilter && statusFilter !== "all") {
      q = q.where("status", "==", statusFilter.toUpperCase());
    }

    // Sort by newest first. Limit to 100 for now without cursor pagination to keep UI light.
    const snapshot = await q.orderBy("createdAt", "desc").limit(100).get();
    
    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orderId: data.orderId,
        userName: data.userName || "Anonymous",
        rating: data.rating,
        comment: data.comment,
        status: data.status,
        createdAt: data.createdAt,
      };
    });

    return NextResponse.json({ reviews });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
