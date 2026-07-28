// ============================================================
// GET & POST /api/v1/admin/marketing/global
// Module 6 — Global Platform Marketing Configuration
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

const PLATFORM_CONFIG_DOC = "marketing_defaults";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    
    getAdminApp();
    const db = getFirestore();
    const snap = await db.collection("platformSettings").doc(PLATFORM_CONFIG_DOC).get();
    
    const defaultConfig = {
      bannersEnabled: true,
      campaignsEnabled: true,
      featuredEnabled: true,
      couponsEnabled: true,
    };

    if (!snap.exists) {
      return NextResponse.json({ config: defaultConfig });
    }

    return NextResponse.json({ config: { ...defaultConfig, ...snap.data() } });

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
    const { config } = body;
    
    if (!config) {
      return NextResponse.json({ error: "config payload required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const configRef = db.collection("platformSettings").doc(PLATFORM_CONFIG_DOC);
    
    const beforeSnap = await configRef.get();
    const beforeState: Record<string, unknown> | null = beforeSnap.exists ? (beforeSnap.data() as Record<string, unknown>) : null;

    const updatePayload = {
      bannersEnabled: config.bannersEnabled ?? true,
      campaignsEnabled: config.campaignsEnabled ?? true,
      featuredEnabled: config.featuredEnabled ?? true,
      couponsEnabled: config.couponsEnabled ?? true,
      updatedAt: Timestamp.now(),
      updatedBy: admin.uid
    };

    await configRef.set(updatePayload, { merge: true });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "platform.marketing_config.update",
      targetPath: `platformSettings/${PLATFORM_CONFIG_DOC}`,
      beforeState,
      afterState: updatePayload,
    });

    return NextResponse.json({ success: true, config: updatePayload });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
