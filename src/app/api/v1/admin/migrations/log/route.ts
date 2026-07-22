// ============================================================
// POST /api/v1/admin/migrations/log
// Module 6 — Super Admin Platform
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { logMigration } from "@/lib/admin/migrationTracker";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const { version, description } = await request.json();

    if (!version || !description) {
      return NextResponse.json({ error: "version and description are required" }, { status: 400 });
    }

    await logMigration(version, description, admin.uid);

    return NextResponse.json({ success: true, version, description });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
