// ============================================================
// GET & POST /api/v1/hotel/marketing/banners
// Version 2 — Phase 2 Prompt 2 — Banner CRUD Pipeline
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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

    const snapshot = await db.collection(`merchants/${targetMerchantId}/banners`)
      .orderBy("priority", "desc")
      .get();
      
    const banners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ banners });

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
    const { action, bannerId, banner } = body;

    if (!targetMerchantId || !action) {
      return NextResponse.json({ error: "merchantId and action are required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch modification denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();
    const bannersRef = db.collection(`merchants/${targetMerchantId}/banners`);

    if (action === "create" || action === "update") {
      if (!banner || !banner.title || !banner.imageUrl || !banner.bannerType || !banner.linkType) {
        return NextResponse.json({ error: "Invalid banner data payload" }, { status: 400 });
      }

      if (banner.startDate > banner.endDate) {
        return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
      }

      const payload = {
        ...banner,
        merchantId: targetMerchantId,
        startDate: Timestamp.fromMillis(banner.startDate),
        endDate: Timestamp.fromMillis(banner.endDate),
        updatedAt: Timestamp.now(),
      };

      if (action === "create") {
        payload.createdAt = Timestamp.now();
        const docRef = await bannersRef.add(payload);
        return NextResponse.json({ success: true, bannerId: docRef.id });
      } else {
        if (!bannerId) return NextResponse.json({ error: "bannerId required for update" }, { status: 400 });
        await bannersRef.doc(bannerId).set(payload, { merge: true });
        return NextResponse.json({ success: true });
      }
    }

    if (action === "delete") {
      if (!bannerId) return NextResponse.json({ error: "bannerId required for delete" }, { status: 400 });
      await bannersRef.doc(bannerId).delete();
      return NextResponse.json({ success: true });
    }
    
    if (action === "toggle_status") {
       if (!bannerId || typeof banner?.isActive !== "boolean") return NextResponse.json({ error: "bannerId and isActive boolean required" }, { status: 400 });
       await bannersRef.doc(bannerId).update({ isActive: banner.isActive, updatedAt: Timestamp.now() });
       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Banner API error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
