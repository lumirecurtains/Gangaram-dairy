// ============================================================
// GET /api/v1/hotel/orders
// Module 4A — Hotel Admin Order Management Foundation
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
    const cursor = searchParams.get("cursor");
    const statusFilter = searchParams.get("status");

    if (!targetMerchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch access denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();

    let q = db.collection("orders")
      .where("merchantId", "==", targetMerchantId);

    if (statusFilter) {
      q = q.where("status", "==", statusFilter);
    }

    q = q.orderBy("createdAt", "desc").limit(50);

    if (cursor) {
      const cursorDoc = await db.collection("orders").doc(cursor).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snap = await q.get();
    
    // Transform to protect PII while delivering required fulfillment details
    const orders = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        grandTotal: data.grandTotal,
        subTotal: data.subTotal,
        deliveryFee: data.deliveryFee,
        discountPercent: data.discountPercent || 0,
        couponCode: data.couponCode || null,
        items: data.items,
        deliveryAddress: {
          flat: data.deliveryAddress?.flat || "",
          street: data.deliveryAddress?.street || "",
          city: data.deliveryAddress?.city || "",
          pincode: data.deliveryAddress?.pincode || ""
        },
        riderId: data.riderId || null
      };
    });

    return NextResponse.json({ 
      orders, 
      nextCursor: snap.docs.length === 50 ? snap.docs[snap.docs.length - 1].id : null 
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
