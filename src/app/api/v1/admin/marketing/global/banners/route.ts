// ============================================================
// GET & POST /api/v1/admin/marketing/global/banners
// Module 6 — Global Banner Engine
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    // Only fetch global banners explicitly matching merchantId == null (or "global")
    // Client storefronts can use this to merge alongside their local banners
    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context") || "admin";
    
    if (context === "admin") {
      await requireSuperAdmin(request);
    } // If context !== admin, we allow public read for storefront integration

    getAdminApp();
    const db = getFirestore();

    let query = db.collection("globalBanners").orderBy("priority", "desc");
    
    // Only return currently active banners to public storefront calls to prevent exposing stale admin data
    if (context !== "admin") {
      query = query.where("isActive", "==", true) as any;
    }

    const snapshot = await query.get();
      
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
    const admin = await requireSuperAdmin(request);
    
    const body = await request.json();
    const { action, bannerId, banner } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const bannersRef = db.collection("globalBanners");

    if (action === "create" || action === "update") {
      if (!banner || !banner.title || !banner.imageUrl || !banner.bannerType || !banner.linkType) {
        return NextResponse.json({ error: "Invalid banner data payload" }, { status: 400 });
      }

      if (banner.startDate > banner.endDate) {
        return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
      }

      const payload = {
        ...banner,
        startDate: Timestamp.fromMillis(banner.startDate),
        endDate: Timestamp.fromMillis(banner.endDate),
        updatedAt: Timestamp.now(),
        updatedBy: admin.uid
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
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
