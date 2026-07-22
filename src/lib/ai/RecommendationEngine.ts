// ============================================================
// RECOMMENDATION ENGINE INTERFACE — Gangaram AI
// Module 15 — Isolation-first enhancement layer
// ============================================================

export interface RecommendedItem {
  itemId: string;
  name: string;
  ourPrice: number;
  category: string;
  score: number;
  reason: string;
}

/**
 * Interface for recommendation engines.
 * Implementations must be merchant-scoped and never leak
 * cross-merchant data.
 */
export interface RecommendationEngine {
  /**
   * Get recommended items for a given merchant and optionally an item.
   *
   * @param merchantId - The merchant's ID (scoping boundary)
   * @param itemId - Optional: get recommendations related to this item
   * @returns Array of recommended items with scores
   */
  getRecommendations(
    merchantId: string,
    itemId?: string
  ): Promise<RecommendedItem[]>;
}
