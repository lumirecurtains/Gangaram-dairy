// ============================================================
// LLM RECOMMENDATION ENGINE — Gangaram AI (PLACEHOLDER)
// Module 15 — Stub that throws "not yet configured"
// Will be replaced with actual LLM integration when ready
// ============================================================

import type { RecommendationEngine, RecommendedItem } from "./RecommendationEngine";

/**
 * Placeholder engine for future LLM-powered recommendations.
 * Throws "not yet configured" when invoked.
 *
 * Zero runtime dependency — this is never instantiated unless
 * the user explicitly flips the aiConfig provider to "anthropic"
 * AND deploys an API key.
 */
export class LlmRecommendationEngine implements RecommendationEngine {
  async getRecommendations(
    _merchantId: string,
    _itemId?: string
  ): Promise<RecommendedItem[]> {
    throw new Error(
      "AI recommendations via LLM are not yet configured. " +
      "Set ANTHROPIC_API_KEY and flip provider to 'anthropic' in /aiConfig/global."
    );
  }
}
