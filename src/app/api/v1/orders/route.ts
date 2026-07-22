// ============================================================
// POST /api/v1/orders — Create Order
// Module 1/3 — Server computes ALL totals
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

import * as crypto from "crypto";
import { checkRateLimit } from "@/lib/security/rateLimiter";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    getAdminApp();
    const db = getFirestore();

        const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) {
        return NextResponse.json({ error: "Request already processing" }, { status: 429 });
      }
      return NextResponse.json(idemResult.existingResult);
    }

    const rl = await checkRateLimit(user.uid, "orders:create");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const { items, merchantId, deliveryAddress } = body;

    // Validate required fields
    if (!items?.length || !merchantId || !deliveryAddress) {
      return NextResponse.json(
        { error: "Missing required fields: items, merchantId, deliveryAddress" },
        { status: 400 }
      );
    }

    if (!deliveryAddress.flat || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode) {
      return NextResponse.json(
        { error: "Incomplete delivery address" },
        { status: 400 }
      );
    }

    // Verify merchant exists
    const merchantSnap = await db.collection("merchants").doc(merchantId).get();
    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Generate secure 4-digit PIN
    const deliveryPin = crypto.randomInt(1000, 10000).toString();
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(deliveryPin, salt, 64).toString("hex");
    const deliveryPinHash = `${salt}:${hash}`;

        // Fetch actual menus to compute pricing securely
    const menuRef = db.collection("merchants").doc(merchantId).collection("menus");
    const menuDocs = await Promise.all(items.map((i: any) => menuRef.doc(i.itemId).get()));

    let subTotal = 0;
    const secureItems = [];

    for (let i = 0; i < items.length; i++) {
      const doc = menuDocs[i];
      if (!doc.exists) {
        throw new Error(`Item ${items[i].itemId} not found`);
      }
      const data = doc.data()!;
      if (!data.isAvailable) {
        throw new Error(`Item ${data.name} is currently unavailable`);
      }

      const qty = items[i].qty || 1;
      subTotal += data.ourPrice * qty;

      secureItems.push({
        itemId: doc.id,
        name: data.name,
        qty: qty,
        ourPrice: data.ourPrice,
        aggregatorPrice: data.aggregatorPrice || null,
        baseCost: data.baseCost || 0,
        hotelProfit: data.hotelProfit || 0,
      });
    }
    const deliveryFee = 30; // Flat fee, configurable later
    const afterDeliveryFee = subTotal - deliveryFee;
    const hotelShare = Math.round(afterDeliveryFee * 0.7 * 100) / 100;
    const riderShare = Math.round(afterDeliveryFee * 0.3 * 100) / 100;
    const grandTotal = Math.round((subTotal + deliveryFee) * 100) / 100;

    const now = Timestamp.now();

    const order = {
      userId: user.uid,
      merchantId,
      riderId: null,
      items: secureItems,
      status: "pending_payment",
      deliveryAddress: {
        flat: deliveryAddress.flat,
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        pincode: deliveryAddress.pincode,
        landmark: deliveryAddress.landmark || null,
      },
      subTotal,
      deliveryFee,
      hotelShare,
      riderShare,
      grandTotal,
      razorpayOrderId: null,
      paymentId: null,
      deliveryPinHash,
      failedPinAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    const orderRef = await db.collection("orders").add(order);

    // Save plaintext PIN to private secrets subcollection for customer retrieval
    await orderRef.collection("private").doc("secrets").set({
      deliveryPin
    });

        const finalResponse = {
      orderId: orderRef.id,
      subTotal,
      deliveryFee,
      hotelShare,
      riderShare,
      grandTotal,
      razorpayOrderId: null, // Will be created by payment module
      deliveryPin // Return once for immediate client state
    };

    await storeIdempotencyResult(idempotencyKey, user.uid, finalResponse);

    return NextResponse.json(finalResponse);
  } catch (err: any) {
    console.error("Order creation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}

