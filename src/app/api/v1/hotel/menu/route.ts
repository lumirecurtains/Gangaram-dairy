// ============================================================
// GET & POST /api/v1/hotel/menu
// Module 3B — Menu Management Foundation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetMerchantId = searchParams.get("merchantId") || user.merchantId;

    if (!targetMerchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch access denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();

    const snapshot = await db.collection(`merchants/${targetMerchantId}/menus`).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const targetMerchantId = body.merchantId || user.merchantId;

    if (!targetMerchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch modification denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();
    const menuRef = db.collection(`merchants/${targetMerchantId}/menus`);

    const { action } = body;

    if (action === "create_item") {
      const { item } = body;
      if (!item || !item.name || !item.category) {
        return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
      }
      
      const slugId = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const existing = await menuRef.doc(slugId).get();
      if (existing.exists) {
        return NextResponse.json({ error: "An item with this name already exists" }, { status: 400 });
      }

      await menuRef.doc(slugId).set({
        ...item,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });

      return NextResponse.json({ success: true, itemId: slugId });
    }

    if (action === "update_item") {
      const { itemId, item } = body;
      if (!itemId || !item) {
        return NextResponse.json({ error: "itemId and item data required" }, { status: 400 });
      }

      await menuRef.doc(itemId).set({
        ...item,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      return NextResponse.json({ success: true });
    }

    if (action === "delete_item") {
      const { itemId } = body;
      if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
      
      await menuRef.doc(itemId).delete();
      return NextResponse.json({ success: true });
    }

    if (action === "rename_category") {
      const { oldName, newName } = body;
      if (!oldName || !newName) return NextResponse.json({ error: "oldName and newName required" }, { status: 400 });

      const snap = await menuRef.where("category", "==", oldName).get();
      if (snap.empty) return NextResponse.json({ success: true });

      const batch = db.batch();
      snap.docs.forEach(doc => {
        batch.update(doc.ref, { category: newName, updatedAt: Timestamp.now() });
      });
      await batch.commit();

      return NextResponse.json({ success: true });
    }

    if (action === "delete_category") {
      const { categoryName } = body;
      if (!categoryName) return NextResponse.json({ error: "categoryName required" }, { status: 400 });

      const snap = await menuRef.where("category", "==", categoryName).get();
      if (snap.empty) return NextResponse.json({ success: true });

      const batch = db.batch();
      snap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Menu API error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
