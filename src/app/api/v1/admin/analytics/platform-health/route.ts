import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { getPlatformHealthInsights } from "@/lib/firestoreHelpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    const insights = await getPlatformHealthInsights(days);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error: any) {
    console.error("Error in Platform Health Analytics API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") || error.message?.includes("Authorization") ? 403 : 500 }
    );
  }
}
