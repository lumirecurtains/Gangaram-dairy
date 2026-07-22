// ============================================================
// CHANNEL SENDER INTERFACE — Gangaram Notifications
// Module 12 — Strategy pattern for multi-channel dispatch
// ============================================================

import type { DispatchJob, DispatchResult } from "./types";

/**
 * Interface for channel-specific senders.
 * Each implementation handles one notification channel
 * (WhatsApp, SMS, Push, In-App).
 */
export interface ChannelSender {
  /**
   * The channel identifier this sender handles.
   */
  readonly channel: "whatsapp" | "sms" | "push" | "in_app";

  /**
   * Send a notification through this channel.
   * Should never throw — capture errors internally and return a DispatchResult.
   */
  send(job: DispatchJob): Promise<DispatchResult>;
}
