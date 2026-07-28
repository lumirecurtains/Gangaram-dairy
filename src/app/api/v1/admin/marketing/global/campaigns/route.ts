// ============================================================
// GET & POST /api/v1/admin/marketing/global/campaigns
// Module 6 — Global Campaign Engine
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context") || "admin";
    
    if (context === "admin") {
      await requireSuperAdmin(request);
    }

    getAdminApp();
    const db = getFirestore();

    const snapshot = await db.collection("globalCampaigns")
      .orderBy("startDate", "desc")
      .get();
      
    const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ campaigns });

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
    const { action, campaignId, campaign } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const campaignsRef = db.collection("globalCampaigns");

    if (action === "create" || action === "update") {
      if (!campaign || !campaign.name) {
        return NextResponse.json({ error: "Invalid campaign data payload" }, { status: 400 });
      }

      if (campaign.startDate > campaign.endDate) {
        return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
      }

      if (action === "create") {
         const existing = await campaignsRef.where("name", "==", campaign.name).get();
         if (!existing.empty) {
             return NextResponse.json({ error: "A global campaign with this exact name already exists." }, { status: 400 });
         }
      }

      const payload = {
        name: campaign.name,
        description: campaign.description || null,
        startDate: Timestamp.fromMillis(campaign.startDate),
        endDate: Timestamp.fromMillis(campaign.endDate),
        status: campaign.status || "scheduled",
        isActive: campaign.isActive ?? true,
        bannerIds: Array.isArray(campaign.bannerIds) ? campaign.bannerIds : [],
        couponIds: Array.isArray(campaign.couponIds) ? campaign.couponIds : [],
        featuredSectionIds: Array.isArray(campaign.featuredSectionIds) ? campaign.featuredSectionIds : [],
        updatedAt: Timestamp.now(),
        updatedBy: admin.uid
      };

      if (action === "create") {
        (payload as any).createdAt = Timestamp.now();
        const docRef = await campaignsRef.add(payload);
        return NextResponse.json({ success: true, campaignId: docRef.id });
      } else {
        if (!campaignId) return NextResponse.json({ error: "campaignId required for update" }, { status: 400 });
        await campaignsRef.doc(campaignId).set(payload, { merge: true });
        return NextResponse.json({ success: true });
      }
    }

    if (action === "delete") {
      if (!campaignId) return NextResponse.json({ error: "campaignId required for delete" }, { status: 400 });
      await campaignsRef.doc(campaignId).delete();
      return NextResponse.json({ success: true });
    }
    
    if (action === "toggle_status") {
       if (!campaignId || typeof campaign?.isActive !== "boolean") {
           return NextResponse.json({ error: "campaignId and isActive boolean required" }, { status: 400 });
       }
       await campaignsRef.doc(campaignId).update({ isActive: campaign.isActive, updatedAt: Timestamp.now() });
       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Global Campaign API error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
