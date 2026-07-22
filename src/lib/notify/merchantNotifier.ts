// ============================================================
// MERCHANT NOTIFIER — Gangaram
// Module 10 — Notifies merchants via dispatcher pattern
// Replaces the inline notifyMerchant in webhooks/razorpay
// ============================================================

import { getDispatcher } from "@/lib/dispatch/getDispatcher";
import type { DispatchJob } from "@/lib/dispatch/types";

/**
 * Notifies a merchant about a new paid order.
 * Uses the centralized getDispatcher() pattern.
 * Never throws — dispatcher handles errors internally.
 */
export async function notifyMerchantOnOrderPaid(
  orderId: string,
  merchantId: string
): Promise<void> {
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

  await dispatcher.dispatch(job);
}
