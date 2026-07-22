// ============================================================
// POST /api/v1/ai/support-chat — AI Support Chat (OPTIONAL)
// Module 15 — Disabled by default, read-only, no write access
// to business collections. Off unless supportChatEnabled in config.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { checkRateLimit } from "@/lib/security/rateLimiter";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    const rl = await checkRateLimit(user.uid, "ai:chat");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    getAdminApp();
    const db = getFirestore();
    const configSnap = await db.collection("aiConfig").doc("global").get();

    const supportChatEnabled = configSnap.exists
      ? (configSnap.data()?.supportChatEnabled as boolean) ?? false
      : false;

    if (!supportChatEnabled) {
      return NextResponse.json(
        { error: "AI support chat is not enabled" },
        { status: 400 }
      );
    }

    const { message } = (await request.json()) as { message?: string };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // For now, return a stub response.
    // When ANTHROPIC_API_KEY is configured and provider is set to "anthropic",
    // this route will stream responses from the LLM.
    //
    // IMPORTANT SECURITY NOTES:
    // - This is the ONE route in the entire platform that calls a third-party LLM
    // - It has NO write access to /orders, /merchants, or payment collections
    // - It has NO function-calling capability
    // - It is OFF by default (supportChatEnabled must be true in /aiConfig/global)

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const provider = configSnap.exists
      ? String(configSnap.data()?.provider || "none")
      : "none";

    if (apiKey && provider === "anthropic") {
      // LLM integration stub — replace with actual Anthropic SDK call
      // const response = await anthropic.messages.create({ ... });

      return NextResponse.json({
        reply:
          "AI support chat will be available soon. Our team has been notified of your query.",
        provider: "anthropic",
      });
    }

    // Default stub response
    return NextResponse.json({
      reply:
        "Thank you for your message. Our support team will get back to you shortly. " +
        "AI chat will be enabled in a future update.",
      provider: "none",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}
