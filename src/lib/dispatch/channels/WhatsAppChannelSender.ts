// ============================================================
// WHATSAPP CHANNEL SENDER — Gangaram Notifications
// Module 12 — Sends WhatsApp notifications via configured provider
// ============================================================

import type { ChannelSender } from "../ChannelSender";
import type { DispatchJob, DispatchResult } from "../types";
import { withRetry } from "../withRetry";
import { getTemplate, renderTemplate } from "../NotificationTemplateRepo";
import { isChannelAllowed } from "../preferenceGate";

export class WhatsAppChannelSender implements ChannelSender {
  readonly channel = "whatsapp" as const;

  async send(job: DispatchJob): Promise<DispatchResult> {
    const userId = job.payload.userId as string | undefined;

    // Check user preference — muted channel = no-op success
    if (userId) {
      const allowed = await isChannelAllowed(userId, "whatsapp");
      if (!allowed) {
        return {
          success: true,
          jobId: job.id,
          jobType: job.type,
          attempts: 0,
          lastError: null,
        };
      }
    }

    const url = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!url || !apiKey) {
      return {
        success: false,
        jobId: job.id,
        jobType: job.type,
        attempts: 0,
        lastError: "WhatsApp API not configured (WHATSAPP_API_URL or WHATSAPP_API_KEY missing)",
      };
    }

    // Attempt to load and render a template
    let messageBody = (job.payload.message as string) || "";
    const templateKey = job.payload.templateKey as string | undefined;
    if (templateKey) {
      const template = await getTemplate(templateKey);
      if (template) {
        messageBody = renderTemplate(template.bodyTemplate, job.payload as Record<string, string | number | undefined>);
      }
    }

    const result = await withRetry(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          merchantId: job.payload.merchantId,
          orderId: job.payload.orderId,
          message: messageBody,
          to: job.payload.phoneNumber,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`WhatsApp API error (${res.status}): ${errBody}`);
      }

      return true;
    });

    return {
      success: result.success,
      jobId: job.id,
      jobType: job.type,
      attempts: result.attempts,
      lastError: result.lastError,
    };
  }
}
