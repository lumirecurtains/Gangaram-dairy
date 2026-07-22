// ============================================================
// GET /api/v1/onboarding/eligibility?merchantId=&lat=&lng=
// Module 7 — Merchant Onboarding (Haversine geo-check)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { haversineDistance, isWithinRadius } from "@/lib/onboarding/haversine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");

    if (!merchantId || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "merchantId, lat, and lng query parameters are required" },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();
    const merchantSnap = await db.collection("merchants").doc(merchantId).get();

    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchantData = merchantSnap.data()!;
    const geoFence = merchantData.geoFence as { lat: number; lng: number; radiusKm: number } | undefined;

    if (!geoFence) {
      return NextResponse.json({
        eligible: false,
        reason: "Merchant has no delivery geo-fence configured",
        merchantId,
      });
    }

    const distance = haversineDistance(geoFence.lat, geoFence.lng, lat, lng);
    const eligible = isWithinRadius(geoFence.lat, geoFence.lng, lat, lng, geoFence.radiusKm);

    return NextResponse.json({
      eligible,
      merchantId,
      distanceKm: Math.round(distance * 100) / 100,
      radiusKm: geoFence.radiusKm,
      withinRange: eligible,
    });
  } catch (err: any) {
    console.error("Eligibility check error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
