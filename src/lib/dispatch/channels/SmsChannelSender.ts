// ============================================================
// SMS CHANNEL SENDER — Gangaram Notifications
// Module 12 — Sends SMS via configured provider (Twilio/MSG91/...)
// ============================================================

import type { ChannelSender } from "../ChannelSender";
import type { DispatchJob, DispatchResult } from "../types";
import { withRetry } from "../withRetry";
import { getTemplate, renderTemplate } from "../NotificationTemplateRepo";
import { isChannelAllowed } from "../preferenceGate";

export class SmsChannelSender implements ChannelSender {
  readonly channel = "sms" as const;

  async send(job: DispatchJob): Promise<DispatchResult> {
    const userId = job.payload.userId as string | undefined;

    // Check user preference
    if (userId) {
      const allowed = await isChannelAllowed(userId, "sms");
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

    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID;

    if (!apiKey || !senderId) {
      return {
        success: false,
        jobId: job.id,
        jobType: job.type,
        attempts: 0,
        lastError: "SMS API not configured (SMS_API_KEY or SMS_SENDER_ID missing)",
      };
    }

    let messageBody = (job.payload.message as string) || "";
    const templateKey = job.payload.templateKey as string | undefined;
    if (templateKey) {
      const template = await getTemplate(templateKey);
      if (template) {
        messageBody = renderTemplate(template.bodyTemplate, job.payload as Record<string, string | number | undefined>);
      }
    }

    const result = await withRetry(async () => {
      // Generic SMS provider call — replace URL with actual provider
      const smsApiUrl =
        process.env.SMS_API_URL || "https://api.msg91.com/api/v5/flow/";

      const res = await fetch(smsApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: apiKey,
        },
        body: JSON.stringify({
          sender: senderId,
          mobiles: job.payload.phoneNumber,
          message: messageBody,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`SMS API error (${res.status}): ${errBody}`);
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
