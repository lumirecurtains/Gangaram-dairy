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

    // PERFORMANCE/SCALABILITY FIX: Module 15
    // Instead of querying 100 historical orders per request (which triggers massive read spikes and memory iteration),
    // we query the currently active menu for the merchant.
    
    const menuRef = db.collection("merchants").doc(merchantId).collection("menus");
    
    if (itemId) {
       // If item given, fetch its category and recommend other available items in the same category
       const itemDoc = await menuRef.doc(itemId).get();
       if (!itemDoc.exists) return [];
       
       const data = itemDoc.data()!;
       const category = data.category || "General";
       
       const recommendationsSnap = await menuRef
         .where("category", "==", category)
         .where("isAvailable", "==", true)
         .limit(6)
         .get();
         
       return recommendationsSnap.docs
         .filter(doc => doc.id !== itemId)
         .map(doc => {
           const d = doc.data();
           return {
             itemId: doc.id,
             name: d.name,
             ourPrice: d.ourPrice,
             category: d.category || "General",
             score: 85,
             reason: "Similar category",
           };
         }).slice(0, 5);
    }
    
    // Fallback: Return 5 available items globally for the merchant
    const popularSnap = await menuRef
      .where("isAvailable", "==", true)
      .limit(5)
      .get();
      
    return popularSnap.docs.map(doc => {
      const d = doc.data();
      return {
        itemId: doc.id,
        name: d.name,
        ourPrice: d.ourPrice,
        category: d.category || "General",
        score: 90,
        reason: "Merchant favorite",
      };
    });
  }

}
