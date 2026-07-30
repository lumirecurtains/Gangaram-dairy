// ============================================================
// GET & POST /api/v1/hotel/marketing/featured
// Version 2 — Phase 4 Prompt 1 — Featured Sections CRUD Pipeline
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { validateMarketingReferences } from "@/lib/marketing/validateMarketingReferences";

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

    const snapshot = await db.collection(`merchants/${targetMerchantId}/featuredSections`)
      .orderBy("priority", "desc")
      .get();
      
    const featuredSections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ featuredSections });

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
    const { action, sectionId, section } = body;

    if (!targetMerchantId || !action) {
      return NextResponse.json({ error: "merchantId and action are required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch modification denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();
    const sectionsRef = db.collection(`merchants/${targetMerchantId}/featuredSections`);

    if (action === "create" || action === "update") {
      if (!section || !section.name || !section.sectionType) {
        return NextResponse.json({ error: "Invalid section data payload" }, { status: 400 });
      }

      if (!Array.isArray(section.itemIds) || section.itemIds.length === 0) {
        return NextResponse.json({ error: "At least one product ID must be selected" }, { status: 400 });
      }

      // Validate marketing entity references belong to same merchant
      const refValidation = await validateMarketingReferences("featuredSection", section, { db, targetMerchantId });
      if (!refValidation.valid) {
        return NextResponse.json({ error: refValidation.error }, { status: 400 });
      }

      if (action === "create") {
         const existing = await sectionsRef.where("name", "==", section.name).get();
         if (!existing.empty) {
             return NextResponse.json({ error: "A featured section with this name already exists." }, { status: 400 });
         }
      }

      const payload = {
        name: section.name,
        sectionType: section.sectionType,
        itemIds: section.itemIds,
        isActive: section.isActive ?? true,
        priority: Number(section.priority) || 0,
        merchantId: targetMerchantId,
        updatedAt: Timestamp.now(),
      };

      if (action === "create") {
        (payload as any).createdAt = Timestamp.now();
        const docRef = await sectionsRef.add(payload);
        return NextResponse.json({ success: true, sectionId: docRef.id });
      } else {
        if (!sectionId) return NextResponse.json({ error: "sectionId required for update" }, { status: 400 });
        await sectionsRef.doc(sectionId).set(payload, { merge: true });
        return NextResponse.json({ success: true });
      }
    }

    if (action === "delete") {
      if (!sectionId) return NextResponse.json({ error: "sectionId required for delete" }, { status: 400 });
      await sectionsRef.doc(sectionId).delete();
      return NextResponse.json({ success: true });
    }
    
    if (action === "toggle_status") {
       if (!sectionId || typeof section?.isActive !== "boolean") {
           return NextResponse.json({ error: "sectionId and isActive boolean required" }, { status: 400 });
       }
       await sectionsRef.doc(sectionId).update({ isActive: section.isActive, updatedAt: Timestamp.now() });
       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Featured Sections API error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
