// ============================================================
// Auth Verification — Gangaram
// Module 8 — Lazy bootstrap pipeline
// Verifies Firebase ID token, bootstraps claims from
// /roleAssignments, defaults missing users to "customer"
// Module 10 — Added in-memory L1 cache for isBanned checks
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

// Module 10 Scalability: In-memory TTL cache to prevent N+1 Firestore reads for isBanned checks
interface CacheEntry {
  isBanned: boolean;
  expiresAt: number;
}
const BANNED_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export async function verifyAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  getAdminApp();
  const auth = getAuth();
  const decoded = await auth.verifyIdToken(idToken);

  const db = getFirestore();
  const now = Date.now();

  // Scalability: L1 Cache check for isBanned
  let isBanned = false;
  const cached = BANNED_CACHE.get(decoded.uid);
  
  if (cached && cached.expiresAt > now) {
    isBanned = cached.isBanned;
  } else {
    // Cache miss or expired — fetch from DB
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    isBanned = userDoc.exists ? (userDoc.data()!.isBanned === true) : false;
    BANNED_CACHE.set(decoded.uid, { isBanned, expiresAt: now + CACHE_TTL_MS });
  }

  if (isBanned) {
    throw new Error("Forbidden: User is banned");
  }

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
