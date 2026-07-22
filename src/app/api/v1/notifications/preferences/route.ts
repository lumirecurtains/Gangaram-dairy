// ============================================================
// GET/PUT /api/v1/notifications/preferences
// Module 12 — Self-scoped user notification preferences
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getUserPreferences } from "@/lib/dispatch/preferenceGate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const prefs = await getUserPreferences(user.uid);
    return NextResponse.json({ userId: user.uid, preferences: prefs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const body = (await request.json()) as Record<string, unknown>;

    const allowedFields = [
      "whatsappEnabled",
      "smsEnabled",
      "pushEnabled",
      "marketingOptIn",
    ] as const;

    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };

    for (const field of allowedFields) {
      if (typeof body[field] === "boolean") {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json(
        { error: "No valid preference fields provided" },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();
    await db
      .collection("notificationPreferences")
      .doc(user.uid)
      .set(updateData, { merge: true });

    const updatedPrefs = await getUserPreferences(user.uid);

    return NextResponse.json({
      success: true,
      userId: user.uid,
      preferences: updatedPrefs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}
