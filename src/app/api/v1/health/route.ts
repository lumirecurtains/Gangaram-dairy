import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getAllFailureClasses } from "@/lib/business-layer/failure-mapping";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isDiagnostic = searchParams.get("diagnostic") === "true";

  // Basic Liveness Probe (Public HTTP 200 for load balancers / monitoring probes)
  if (!isDiagnostic) {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "gangaram-api",
      version: "3.0.0",
    });
  }

  // Diagnostic Probe (Authenticated & Restricted to Super Admin / Support Agent)
  try {
    const user = await verifyAuth(request);

    if (!user.isSuperAdmin && !user.isSupportAgent) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin or Support Agent access required for diagnostic health" },
        { status: 403 }
      );
    }

    const checks: Record<string, any> = {};
    let isOverallHealthy = true;
    let isDegraded = false;

    // 1. Firestore Database Latency Check
    const dbStartTime = Date.now();
    try {
      getAdminApp();
      const db = getFirestore();
      await db.collection("merchants").limit(1).get();
      const dbLatencyMs = Date.now() - dbStartTime;

      checks.database = {
        status: dbLatencyMs < 200 ? "healthy" : dbLatencyMs < 500 ? "degraded" : "unhealthy",
        latencyMs: dbLatencyMs,
        thresholdMs: 200,
      };

      if (dbLatencyMs >= 500) isOverallHealthy = false;
      else if (dbLatencyMs >= 200) isDegraded = true;
    } catch (dbErr: any) {
      isOverallHealthy = false;
      checks.database = {
        status: "unhealthy",
        error: "Database connection failed",
        latencyMs: Date.now() - dbStartTime,
      };
    }

    // 2. Firebase Admin Auth Check
    try {
      getAdminApp();
      const auth = getAuth();
      // Probe auth instance
      checks.auth = {
        status: auth ? "healthy" : "unhealthy",
        provider: "firebase-admin",
      };
    } catch (authErr: any) {
      isOverallHealthy = false;
      checks.auth = {
        status: "unhealthy",
        error: "Auth service probe failed",
      };
    }

    // 3. Razorpay Gateway Status Check (Masked, zero secret leaks)
    const hasRazorpayKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
    const hasRazorpaySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    const razorpayConfigured = hasRazorpayKeyId && hasRazorpaySecret;

    checks.paymentGateway = {
      status: razorpayConfigured ? "healthy" : "degraded",
      provider: "razorpay",
      keyIdConfigured: hasRazorpayKeyId,
      keySecretConfigured: hasRazorpaySecret,
    };
    if (!razorpayConfigured) isDegraded = true;

    // 4. Rate Limiter Memory Cache Status
    checks.rateLimiter = {
      status: "healthy",
      mode: "firestore-counters",
    };

    // 5. Registered Failure Classes (from failure-mapping.ts single source of truth)
    const failureClasses = getAllFailureClasses();

    const overallStatus = !isOverallHealthy ? "unhealthy" : isDegraded ? "degraded" : "healthy";

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      checks,
      failureRegistry: {
        totalClasses: failureClasses.length,
        classes: failureClasses,
      },
    }, { status: isOverallHealthy ? 200 : 503 });
  } catch (error: any) {
    console.error("Health diagnostic error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute diagnostic health probe" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}
