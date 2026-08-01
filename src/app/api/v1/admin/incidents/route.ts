import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createOperationalIncident } from "@/lib/notify/createNotification";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    getAdminApp();
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let query: FirebaseFirestore.Query = db.collection("incidents").orderBy("createdAt", "desc").limit(100);

    if (statusFilter) {
      query = db
        .collection("incidents")
        .where("status", "==", statusFilter)
        .orderBy("createdAt", "desc")
        .limit(100);
    }

    const snap = await query.get();
    const incidents = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, incidents });
  } catch (error: any) {
    console.error("Admin Incidents GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request);

    getAdminApp();
    const db = getFirestore();
    const body = await request.json();

    const { incidentId, status } = body;
    if (!incidentId || !["open", "acknowledged", "resolved"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid request. incidentId and valid status required (open, acknowledged, resolved)" },
        { status: 400 }
      );
    }

    const incidentRef = db.collection("incidents").doc(incidentId);
    const incidentDoc = await incidentRef.get();

    if (!incidentDoc.exists) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const now = Timestamp.now();
    const updateData: Record<string, any> = {
      status,
      updatedAt: now,
      updatedBy: user.uid,
    };

    if (status === "acknowledged") {
      updateData.acknowledgedAt = now;
      updateData.acknowledgedBy = user.uid;
    } else if (status === "resolved") {
      updateData.resolvedAt = now;
      updateData.resolvedBy = user.uid;
    }

    await incidentRef.update(updateData);

    return NextResponse.json({ success: true, incidentId, status });
  } catch (error: any) {
    console.error("Admin Incidents PATCH error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const body = await request.json();
    const { failureId, merchantId, description } = body;

    if (!failureId || !description) {
      return NextResponse.json(
        { error: "failureId and description are required" },
        { status: 400 }
      );
    }

    const incidentId = await createOperationalIncident({
      failureId,
      merchantId,
      description,
    });

    return NextResponse.json({ success: true, incidentId });
  } catch (error: any) {
    console.error("Admin Incidents POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}
