// ============================================================
// POST /api/v1/notifications/mark-read
// Module 12 — Marks notification items as read
// Self-scoped: user can only mark their own notifications
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const { itemIds } = (await request.json()) as {
      itemIds?: string[];
    };

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "itemIds array is required" },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();

    // Batch mark items as read
    const batch = db.batch();
    let markedCount = 0;

    for (const itemId of itemIds) {
      const ref = db
        .collection("notifications")
        .doc(user.uid)
        .collection("items")
        .doc(itemId);

      batch.update(ref, { read: true });
      markedCount++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      markedCount,
      itemIds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}
