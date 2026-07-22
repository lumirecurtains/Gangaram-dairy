// ============================================================
// Auth Verification — Gangaram
// Module 8 — Lazy bootstrap pipeline
// Verifies Firebase ID token, bootstraps claims from
// /roleAssignments, defaults missing users to "customer"
// ============================================================

import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { NextRequest } from "next/server";

export interface AuthenticatedUser {
  uid: string;
  phoneNumber?: string;
  isSuperAdmin: boolean;
  isSupportAgent: boolean;
  isMerchantStaff: boolean;
  isRider: boolean;
  merchantId?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  getAdminApp();
  const auth = getAuth();
  const decoded = await auth.verifyIdToken(idToken);

  if (decoded.super_admin || decoded.merchant_staff || decoded.rider || decoded.support_agent) {
    return {
      uid: decoded.uid,
      phoneNumber: decoded.phone_number,
      isSuperAdmin: !!decoded.super_admin,
      isSupportAgent: !!decoded.support_agent,
      isMerchantStaff: !!decoded.merchant_staff,
      isRider: !!decoded.rider,
      merchantId: decoded.merchantId ? String(decoded.merchantId) : undefined,
    };
  }

  const db = getFirestore();
  const roleRef = db.collection("roleAssignments").doc(decoded.uid);
  const roleDoc = await roleRef.get();

  let isSuperAdmin = false;
  let isSupportAgent = false;
  let isMerchantStaff = false;
  let isRider = false;
  let merchantId: string | undefined;

  if (roleDoc.exists) {
    const data = roleDoc.data()!;
    isSuperAdmin = !!data.super_admin;
    isSupportAgent = !!data.support_agent;
    isMerchantStaff = !!data.merchant_staff;
    isRider = !!data.rider;
    merchantId = data.merchantId ? String(data.merchantId) : undefined;
  } else {
    await roleRef.set({
      grantedBy: "system-lazy-bootstrap",
      grantedAt: Timestamp.now(),
    });
  }

  const claims: Record<string, any> = { 
    super_admin: isSuperAdmin,
    support_agent: isSupportAgent,
    merchant_staff: isMerchantStaff,
    rider: isRider
  };
  if (merchantId) {
    claims.merchantId = merchantId;
  }
  await auth.setCustomUserClaims(decoded.uid, claims);

  return {
    uid: decoded.uid,
    phoneNumber: decoded.phone_number,
    isSuperAdmin,
    isSupportAgent,
    isMerchantStaff,
    isRider,
    merchantId,
  };
}

export async function requireSuperAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await verifyAuth(request);
  if (!user.isSuperAdmin) {
    throw new Error("Forbidden: super_admin access required");
  }
  return user;
}
