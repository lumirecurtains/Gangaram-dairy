// ============================================================
// GET /api/v1/reviews/merchant/[merchantId] — Fetch Reviews
// Module 13 — Paginated, public endpoint for approved reviews
//
// Returns approved reviews for a merchant, sorted by newest
// first. Supports cursor-based pagination.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

interface RouteParams {
  params: Promise<{ merchantId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    getAdminApp();
    const db = getFirestore();

    const { merchantId } = await params;

    if (!merchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    const url = new URL(request.url);
    const limitParam = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 1), 50);
    const cursor = url.searchParams.get("cursor");

    // Build query: approved reviews for this merchant, sorted newest first
    let query:
      | FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
      | FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      db
        .collection("reviews")
        .where("merchantId", "==", merchantId)
        .where("status", "==", "APPROVED")
        .orderBy("createdAt", "desc")
        .limit(limitParam);

    if (cursor) {
      const cursorDoc = await db.collection("reviews").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();

    const reviews = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userName: data.userName || "Anonymous",
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    const nextCursor = snapshot.docs.length === limitParam ? snapshot.docs[snapshot.docs.length - 1].id : null;

    return NextResponse.json({
      reviews,
      nextCursor,
      hasMore: snapshot.docs.length === limitParam,
    });
  } catch (err: any) {
    console.error("Fetch reviews error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
