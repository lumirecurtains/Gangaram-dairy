import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getCustomerBehaviorInsights } from "@/lib/firestoreHelpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    // Role authorization check: only merchant staff, hotel admin, or super admin can access branch analytics
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
        { error: "Forbidden: Cannot access another branch's customer behavior data" },
        { status: 403 }
      );
    }

    const insights = await getCustomerBehaviorInsights(merchantId, days);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error: any) {
    console.error("Error in Branch Customer Behavior API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}
