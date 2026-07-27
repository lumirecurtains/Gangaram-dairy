// ============================================================
// GET & POST /api/v1/hotel/staff
// Module 4B — Hotel Admin Staff Management Foundation
// Allows Hotel Admin to assign/revoke Kitchen Staff claims 
// securely scoped to their own merchantId.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    // Authorization
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
    const auth = getAuth();

    // 1. Fetch kitchen staff
    const staffSnap = await db.collection("roleAssignments")
      .where("merchantId", "==", targetMerchantId)
      .where("merchant_staff", "==", true)
      .get();

    // 2. Fetch assigned riders (visibility only)
    // Riders aren't permanently bound to a merchantId, but if the architecture eventually
    // supports dedicated fleet riders via roleAssignments.merchantId, we fetch them here.
    const riderSnap = await db.collection("roleAssignments")
      .where("merchantId", "==", targetMerchantId)
      .where("rider", "==", true)
      .get();

    const staffPromises = [...staffSnap.docs, ...riderSnap.docs].map(async (doc) => {
      const data = doc.data();
      let phone = "Unknown";
      try {
        const userRecord = await auth.getUser(doc.id);
        phone = userRecord.phoneNumber || "Unknown";
      } catch (e) {
        // User might have been deleted from Auth but orphaned in Firestore
      }
      return {
        uid: doc.id,
        role: data.merchant_staff ? "merchant_staff" : "rider",
        phone,
        grantedAt: data.grantedAt,
      };
    });

    const staff = await Promise.all(staffPromises);

    // Deduplicate in case a user somehow holds both roles mapped to the same merchant
    const uniqueStaff = Array.from(new Map(staff.map(item => [item.uid, item])).values());

    return NextResponse.json({ staff: uniqueStaff });

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
    
    // Authorization
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { targetUid, action } = body;
    const targetMerchantId = body.merchantId || user.merchantId;

    if (!targetMerchantId || !targetUid || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch modification denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();
    const auth = getAuth();

    // Verify target user isn't a Super Admin to prevent privilege reduction/escalation attacks
    const targetUserRecord = await auth.getUser(targetUid);
    const currentClaims = targetUserRecord.customClaims || {};
    
    if (currentClaims.super_admin) {
      return NextResponse.json({ error: "Forbidden: Cannot modify Super Admin privileges" }, { status: 403 });
    }

    const newClaims = { ...currentClaims };

    // ---- assign_staff ----
    if (action === "assign_staff") {
      newClaims.merchant_staff = true;
      newClaims.merchantId = targetMerchantId;

      await auth.setCustomUserClaims(targetUid, newClaims);
      await db.collection("roleAssignments").doc(targetUid).set({
        merchant_staff: true,
        merchantId: targetMerchantId,
        grantedBy: user.uid,
        grantedAt: Timestamp.now(),
      }, { merge: true });

      return NextResponse.json({ success: true, action });
    }

    // ---- revoke_staff ----
    if (action === "revoke_staff") {
      // Ensure Hotel Admin isn't revoking staff from another branch
      const existingAssignment = await db.collection("roleAssignments").doc(targetUid).get();
      if (existingAssignment.exists) {
        const data = existingAssignment.data()!;
        if (!user.isSuperAdmin && data.merchantId !== targetMerchantId) {
          return NextResponse.json({ error: "Forbidden: User belongs to another branch" }, { status: 403 });
        }
      }

      newClaims.merchant_staff = false;
      newClaims.merchantId = null;

      await auth.setCustomUserClaims(targetUid, newClaims);
      await db.collection("roleAssignments").doc(targetUid).update({
        merchant_staff: false,
        merchantId: null,
        revokedAt: Timestamp.now(),
      });

      return NextResponse.json({ success: true, action });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Staff API error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
