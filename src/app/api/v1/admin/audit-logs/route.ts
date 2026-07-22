// ============================================================
// GET /api/v1/admin/audit-logs — Cursor-paginated audit logs
// Module 6 — Super Admin Platform
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    getAdminApp();
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    let query: FirebaseFirestore.Query = db
      .collection("auditLogs")
      .orderBy("timestamp", "desc")
      .limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.collection("auditLogs").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.slice(0, limit).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const nextCursor = snapshot.docs.length > limit ? snapshot.docs[limit - 1].id : null;

    return NextResponse.json({ logs, nextCursor });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
