// ============================================================
// GET/POST /api/v1/admin/support-tickets
// Module 6 — Super Admin Platform
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user.isSuperAdmin && !user.isSupportAgent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const statusFilter = searchParams.get("status");

    let query: FirebaseFirestore.Query = db
      .collection("supportTickets")
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (statusFilter) {
      query = db
        .collection("supportTickets")
        .where("status", "==", statusFilter)
        .orderBy("createdAt", "desc")
        .limit(limit + 1);
    }

    if (cursor) {
      const cursorDoc = await db.collection("supportTickets").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const tickets = snapshot.docs.slice(0, limit).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const nextCursor = snapshot.docs.length > limit ? snapshot.docs[limit - 1].id : null;

    return NextResponse.json({ tickets, nextCursor });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user.isSuperAdmin && !user.isSupportAgent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ticketId, merchantId, subject, status, priority } = await request.json();

    if (!ticketId && (!merchantId || !subject)) {
      return NextResponse.json(
        { error: "For new tickets: merchantId and subject are required" },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();

    if (ticketId) {
      // Update existing ticket
      const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;

      await db.collection("supportTickets").doc(ticketId).update(updateData);

      await writeAuditLog({
        actorUid: user.uid,
        action: "support-tickets.update",
        targetPath: `supportTickets/${ticketId}`,
        beforeState: null,
        afterState: updateData,
      });

      return NextResponse.json({ success: true, ticketId, ...updateData });
    }

    // Create new ticket
    const newTicket = {
      merchantId,
      subject,
      status: status || "open",
      priority: priority || "medium",
      createdBy: user.uid,
      createdAt: Timestamp.now(),
    };

    const ref = await db.collection("supportTickets").add(newTicket);

    await writeAuditLog({
      actorUid: user.uid,
      action: "support-tickets.create",
      targetPath: `supportTickets/${ref.id}`,
      beforeState: null,
      afterState: newTicket,
    });

    return NextResponse.json({ success: true, ticketId: ref.id, ...newTicket });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
