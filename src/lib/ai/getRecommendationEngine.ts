// ============================================================
// GET RECOMMENDATION ENGINE FACTORY — Gangaram AI
// Module 15 — Reads /aiConfig/global, returns correct engine
// "none" or unset => HeuristicRecommendationEngine (DEFAULT)
// "anthropic" => LlmRecommendationEngine (PLACEHOLDER)
// ============================================================

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import type { RecommendationEngine } from "./RecommendationEngine";
import { HeuristicRecommendationEngine } from "./HeuristicRecommendationEngine";
import { LlmRecommendationEngine } from "./LlmRecommendationEngine";

let cachedEngine: RecommendationEngine | null = null;

/**
 * Returns the correct RecommendationEngine based on
 * the /aiConfig/global Firestore configuration document.
 *
 * provider | Engine
 * ---------|------------------------------
 * "none"   | HeuristicRecommendationEngine (DEFAULT, free, no API)
 * ""       | HeuristicRecommendationEngine
 * "anthropic" | LlmRecommendationEngine (PLACEHOLDER)
 * any other | HeuristicRecommendationEngine (safe fallback)
 */
export async function getRecommendationEngine(): Promise<RecommendationEngine> {
  if (cachedEngine) return cachedEngine;

  getAdminApp();
  const db = getFirestore();
  const configSnap = await db.collection("aiConfig").doc("global").get();

  let provider: string = "none";

  if (configSnap.exists) {
    const data = configSnap.data()!;
    provider = String(data.provider || "none");
  }

  switch (provider) {
    case "anthropic":
      cachedEngine = new LlmRecommendationEngine();
      break;
    case "none":
    default:
      cachedEngine = new HeuristicRecommendationEngine();
      break;
  }

  return cachedEngine;
}

/**
 * Resets the cached engine (for testing or after config changes).
 */
export function resetRecommendationEngine(): void {
  cachedEngine = null;
}
