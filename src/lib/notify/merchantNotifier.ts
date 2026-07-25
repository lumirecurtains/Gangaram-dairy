// ============================================================
// MERCHANT NOTIFIER — Gangaram
// Module 10 — Notifies merchants via dispatcher pattern
// Replaces the inline notifyMerchant in webhooks/razorpay
// ============================================================

import { getDispatcher } from "@/lib/dispatch/getDispatcher";
import type { DispatchJob, DispatchResult } from "@/lib/dispatch/types";

/**
 * Notifies a merchant about a new paid order.
 * Uses the centralized getDispatcher() pattern.
 * Throws an error if the dispatch fails, ensuring the caller knows.
 */
export async function notifyMerchantOnOrderPaid(
  orderId: string,
  merchantId: string
): Promise<DispatchResult> {
  const dispatcher = getDispatcher();

  const job: DispatchJob = {
    id: `whatsapp_${orderId}_${Date.now()}`,
    type: "whatsapp_notify",
    payload: {
      orderId,
      merchantId,
      message: `New order received! Order #${orderId.slice(-8).toUpperCase()}`,
    },
  };

  const result = await dispatcher.dispatch(job);
  
  if (!result.success) {
    console.error(JSON.stringify({
      level: "error",
      message: "Merchant notification dispatch failed",
      orderId,
      merchantId,
      error: result.lastError
    }));
    throw new Error(result.lastError ?? "Failed to dispatch merchant notification");
  }
  
  return result;
}
