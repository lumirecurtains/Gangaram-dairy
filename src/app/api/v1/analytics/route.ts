import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getMerchantPerformanceReport } from "@/lib/firestoreHelpers";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    // Only merchant_staff or super_admin can view performance analytics
    if (user.role !== "merchant_staff" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Merchant or Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (!merchantId) {
      return NextResponse.json(
        { error: "Missing required parameter: merchantId" },
        { status: 400 }
      );
    }

    // Tenant isolation check: merchant_staff can only query their own merchantId
    if (user.role === "merchant_staff" && user.merchantId && user.merchantId !== merchantId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access another branch's performance data" },
        { status: 403 }
      );
    }

    const report = await getMerchantPerformanceReport(merchantId, days);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Error in Analytics API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
