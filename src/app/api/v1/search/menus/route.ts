// ============================================================
// POST /api/v1/search/menus — Dish Search Index
// Fetches available menu item names for a bounded set of merchants
// Safely avoids N+1 on the client by batching parallel reads on server
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    getAdminApp();
    const db = getFirestore();
    
    const body = await request.json();
    const { merchantIds } = body;
    
    if (!merchantIds || !Array.isArray(merchantIds)) {
      return NextResponse.json({ error: "merchantIds array is required" }, { status: 400 });
    }
    
    // Strict bounding to prevent server abuse / unbounded reads
    if (merchantIds.length > 100) {
      merchantIds.length = 100;
    }
    
    // Server-side parallel fetch prevents client N+1 network waterfall
    const promises = merchantIds.map(id => 
      db.collection(`merchants/${id}/menus`).where("isAvailable", "==", true).get()
    );
    
    const snapshots = await Promise.all(promises);
    
    const menus: { merchantId: string; name: string }[] = [];
    
    snapshots.forEach((snap, index) => {
      const merchantId = merchantIds[index];
      snap.docs.forEach(doc => {
        menus.push({
          merchantId,
          name: doc.data().name
        });
      });
    });
    
    return NextResponse.json({ menus });
  } catch (err: any) {
    console.error("Failed to fetch menus for search:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
