import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { getCustomerBehaviorInsights } from "@/lib/firestoreHelpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Strictly restricted to Super Admin role
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Platform-wide aggregation across all branches (no merchantId parameter)
    const insights = await getCustomerBehaviorInsights(undefined, days);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error: any) {
    console.error("Error in Admin Network Customer Behavior API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}
