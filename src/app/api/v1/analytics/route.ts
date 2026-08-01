import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getMerchantPerformanceReport } from "@/lib/firestoreHelpers";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    // Role authorization check: only merchant staff, hotel admin, or super admin can access analytics
    const isAuthorized = user.isMerchantStaff || user.isHotelAdmin || user.isSuperAdmin;
    if (!isAuthorized) {
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

    // Tenant isolation check: non-super-admins can only access their assigned merchantId
    if (!user.isSuperAdmin && user.merchantId && user.merchantId !== merchantId) {
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
