// ============================================================
// PUSH CHANNEL SENDER — Gangaram Notifications
// Module 12 — Sends web push notifications via VAPID keys
// ============================================================

import type { ChannelSender } from "../ChannelSender";
import type { DispatchJob, DispatchResult } from "../types";
import { withRetry } from "../withRetry";
import { getTemplate, renderTemplate } from "../NotificationTemplateRepo";
import { isChannelAllowed } from "../preferenceGate";

export class PushChannelSender implements ChannelSender {
  readonly channel = "push" as const;

  async send(job: DispatchJob): Promise<DispatchResult> {
    const userId = job.payload.userId as string | undefined;

    if (userId) {
      const allowed = await isChannelAllowed(userId, "push");
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

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return {
        success: false,
        jobId: job.id,
        jobType: job.type,
        attempts: 0,
        lastError: "VAPID keys not configured",
      };
    }

    let title = "Gangaram";
    let body = (job.payload.message as string) || "";

    const templateKey = job.payload.templateKey as string | undefined;
    if (templateKey) {
      const template = await getTemplate(templateKey);
      if (template) {
        title = renderTemplate(template.subjectOrTitle, job.payload as Record<string, string | number | undefined>);
        body = renderTemplate(template.bodyTemplate, job.payload as Record<string, string | number | undefined>);
      }
    }

    // In a full implementation, this would look up the user's
    // push subscription from Firestore and send via web-push library.
    // For now, return a structured response that logs the intent.

    const result = await withRetry(async () => {
      // Push implementation stub — integrate with web-push library
      // const pushSubscription = await getPushSubscription(userId);
      // await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body }));
      //
      // For now, log the intent and return success
      console.log(`[Push] Would send to user ${userId}: ${title} - ${body}`);
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
