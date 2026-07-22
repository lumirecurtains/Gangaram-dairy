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
  role: string;
  merchantId?: string;
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 *
 * Lazy bootstrap pipeline:
 * 1. Token has role claim? → Use it immediately.
 * 2. No role claim? → Read /roleAssignments/{uid} from Firestore.
 * 3. No role document? → Default to { role: "customer" }, write record.
 * 4. Apply claims to Firebase Auth, return AuthenticatedUser.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  getAdminApp();
  const auth = getAuth();
  const decoded = await auth.verifyIdToken(idToken);

  // If claims already exist in the token, return immediately
  if (decoded.role) {
    return {
      uid: decoded.uid,
      phoneNumber: decoded.phone_number,
      role: String(decoded.role),
      merchantId: decoded.merchantId ? String(decoded.merchantId) : undefined,
    };
  }

  // Lazy bootstrap: read from /roleAssignments
  const db = getFirestore();
  const roleRef = db.collection("roleAssignments").doc(decoded.uid);
  const roleDoc = await roleRef.get();

  let role = "customer";
  let merchantId: string | undefined;

  if (roleDoc.exists) {
    const data = roleDoc.data()!;
    role = String(data.role || "customer");
    merchantId = data.merchantId ? String(data.merchantId) : undefined;
  } else {
    // No role document exists — default to customer and persist
    await roleRef.set({
      role: "customer",
      grantedBy: "system-lazy-bootstrap",
      grantedAt: Timestamp.now(),
    });
  }

  // Apply claims to Firebase Auth so future requests skip the read
  const claims: Record<string, string | undefined> = { role };
  if (merchantId) {
    claims.merchantId = merchantId;
  }
  await auth.setCustomUserClaims(decoded.uid, claims);

  return {
    uid: decoded.uid,
    phoneNumber: decoded.phone_number,
    role,
    merchantId,
  };
}

/**
 * Requires the caller to have the super_admin role.
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await verifyAuth(request);
  if (user.role !== "super_admin") {
    throw new Error("Forbidden: super_admin access required");
  }
  return user;
}
