// ============================================================
// HEURISTIC RECOMMENDATION ENGINE — Gangaram AI
// Module 15 — DEFAULT engine, NO external API calls
// Queries /orders for item co-occurrence patterns
// ============================================================

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import type { RecommendationEngine, RecommendedItem } from "./RecommendationEngine";

/**
 * Default recommendation engine that uses order history
 * to find frequently co-ordered items.
 *
 * Strategy: query the last 100 orders for this merchant, find
 * which items most frequently appear together with the given item,
 * return top 5. If no itemId given, return most popular items.
 *
 * Zero external API dependencies — purely heuristic.
 */
export class HeuristicRecommendationEngine implements RecommendationEngine {
  async getRecommendations(
    merchantId: string,
    itemId?: string
  ): Promise<RecommendedItem[]> {
    getAdminApp();
    const db = getFirestore();

    // Get the last 100 completed orders for this merchant
    const ordersSnap = await db
      .collection("orders")
      .where("merchantId", "==", merchantId)
      .where("status", "in", ["delivered", "paid"])
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    if (ordersSnap.empty) {
      return [];
    }

    // Build item frequency map: itemId -> count
    const itemFrequency = new Map<string, number>();
    const itemDetails = new Map<string, { name: string; ourPrice: number; category: string }>();

    // If itemId given, build co-occurrence map
    const coOccurrence = new Map<string, number>();
    let hasTargetItem = false;

    for (const doc of ordersSnap.docs) {
      const orderData = doc.data();
      const items = (orderData.items as Array<{
        itemId: string;
        name: string;
        ourPrice: number;
        category?: string;
      }>) || [];

      const itemIdsInOrder = new Set<string>();
      let orderHasTargetItem = false;

      for (const item of items) {
        if (!item.itemId) continue;

        itemIdsInOrder.add(item.itemId);

        if (!itemFrequency.has(item.itemId)) {
          itemFrequency.set(item.itemId, 1);
        } else {
          itemFrequency.set(item.itemId, (itemFrequency.get(item.itemId) ?? 0) + 1);
        }

        if (!itemDetails.has(item.itemId)) {
          itemDetails.set(item.itemId, {
            name: item.name,
            ourPrice: item.ourPrice,
            category: item.category || "General",
          });
        }

        if (itemId && item.itemId === itemId) {
          orderHasTargetItem = true;
        }
      }

      if (orderHasTargetItem) {
        hasTargetItem = true;
        for (const id of itemIdsInOrder) {
          if (id !== itemId) {
            coOccurrence.set(id, (coOccurrence.get(id) ?? 0) + 1);
          }
        }
      }
    }

    // Build recommendations
    const recommendations: RecommendedItem[] = [];

    if (itemId && hasTargetItem) {
      // Item-specific: sort by co-occurrence frequency
      const sortedCoOccurrences = [...coOccurrence.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (const [coItemId, count] of sortedCoOccurrences) {
        const details = itemDetails.get(coItemId);
        const totalWithTarget = [...coOccurrence.values()].reduce((a, b) => a + b, 0) || 1;
        recommendations.push({
          itemId: coItemId,
          name: details?.name || "Unknown Item",
          ourPrice: details?.ourPrice || 0,
          category: details?.category || "General",
          score: Math.round((count / totalWithTarget) * 100),
          reason: `Frequently ordered together`,
        });
      }
    } else {
      // Popular items (no specific item context)
      const sortedItems = [...itemFrequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const maxCount = sortedItems[0]?.[1] || 1;
      for (const [popItemId, count] of sortedItems) {
        const details = itemDetails.get(popItemId);
        recommendations.push({
          itemId: popItemId,
          name: details?.name || "Unknown Item",
          ourPrice: details?.ourPrice || 0,
          category: details?.category || "General",
          score: Math.round((count / maxCount) * 100),
          reason: "Popular item",
        });
      }
    }

    return recommendations;
  }
}
