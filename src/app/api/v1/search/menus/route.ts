// ============================================================
// POST /api/v1/search/menus — Dish Search Index
// Fetches available menu item names for a bounded set of merchants
// Safely avoids N+1 on the client by batching parallel reads on server
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { checkRateLimit } from "@/lib/security/rateLimiter";

export async function POST(request: NextRequest) {
  try {
    getAdminApp();
    const db = getFirestore();
    
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = await checkRateLimit(ip, "search:menus:ip");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    let { merchantIds } = body;
    
    if (!merchantIds || !Array.isArray(merchantIds)) {
      return NextResponse.json({ error: "merchantIds array is required" }, { status: 400 });
    }
    
    merchantIds = Array.from(new Set(merchantIds)).filter(id => typeof id === "string" && id.trim() !== "");
    
    if (merchantIds.length > 50) {
      merchantIds.length = 50;
    }
    
    const promises = merchantIds.map((id: string) => 
      db.collection(`merchants/${id}/menus`).where("isAvailable", "==", true).limit(500).get()
    );
    
    const snapshots = await Promise.all(promises);
    
    const menus: { merchantId: string; name: string }[] = [];
    
    snapshots.forEach((snap, index) => {
      const merchantId = merchantIds[index];
      snap.docs.forEach((doc: any) => {
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
