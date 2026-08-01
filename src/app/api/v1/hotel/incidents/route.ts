import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    const isAuthorized = user.isMerchantStaff || user.isHotelAdmin || user.isSuperAdmin;
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Merchant or Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");

    if (!merchantId) {
      return NextResponse.json(
        { error: "Missing required parameter: merchantId" },
        { status: 400 }
      );
    }

    if (!user.isSuperAdmin && user.merchantId && user.merchantId !== merchantId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access another branch's incident records" },
        { status: 403 }
      );
    }

    getAdminApp();
    const db = getFirestore();

    const snap = await db
      .collection("incidents")
      .where("merchantId", "==", merchantId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const incidents = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, incidents });
  } catch (error: any) {
    console.error("Hotel Incidents GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    const isAuthorized = user.isMerchantStaff || user.isHotelAdmin || user.isSuperAdmin;
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Merchant or Admin access required" },
        { status: 403 }
      );
    }

    getAdminApp();
    const db = getFirestore();
    const body = await request.json();

    const { incidentId, status } = body;
    if (!incidentId || !["open", "acknowledged", "resolved"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid request. incidentId and valid status required" },
        { status: 400 }
      );
    }

    const incidentRef = db.collection("incidents").doc(incidentId);
    const incidentDoc = await incidentRef.get();

    if (!incidentDoc.exists) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const incidentData = incidentDoc.data()!;
    if (!user.isSuperAdmin && user.merchantId && user.merchantId !== incidentData.merchantId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update another branch's incident" },
        { status: 403 }
      );
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
    console.error("Hotel Incidents PATCH error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}
