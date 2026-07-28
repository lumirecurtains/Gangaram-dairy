// ============================================================
// GET & POST /api/v1/admin/marketing/settings
// Version 2 — Phase 5 Prompt 2 — Global Marketing Controls
// Restricts capability configuration per merchant
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    
    if (!merchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const snap = await db.collection("merchants").doc(merchantId).get();
    
    if (!snap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const data = snap.data();
    return NextResponse.json({
      marketingConfig: data?.marketingConfig || {
        bannersEnabled: true,
        campaignsEnabled: true,
        featuredEnabled: true,
        couponsEnabled: true,
      }
    });

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
    await requireSuperAdmin(request);
    
    const body = await request.json();
    const { merchantId, marketingConfig } = body;
    
    if (!merchantId || !marketingConfig) {
      return NextResponse.json({ error: "merchantId and marketingConfig required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const merchantRef = db.collection("merchants").doc(merchantId);
    
    await merchantRef.update({
      marketingConfig,
      updatedAt: Timestamp.now()
    });

    return NextResponse.json({ success: true, marketingConfig });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
