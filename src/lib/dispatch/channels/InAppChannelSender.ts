// ============================================================
// IN-APP CHANNEL SENDER — Gangaram Notifications
// Module 12 — Writes notifications directly to Firestore
// /notifications/{uid}/items/{itemId}
// Free, real-time via onSnapshot
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import type { ChannelSender } from "../ChannelSender";
import type { DispatchJob, DispatchResult } from "../types";
import { withRetry } from "../withRetry";
import { getTemplate, renderTemplate } from "../NotificationTemplateRepo";

export class InAppChannelSender implements ChannelSender {
  readonly channel = "in_app" as const;

  async send(job: DispatchJob): Promise<DispatchResult> {
    const userId = job.payload.userId as string | undefined;
    if (!userId) {
      return {
        success: false,
        jobId: job.id,
        jobType: job.type,
        attempts: 0,
        lastError: "userId is required for in-app notifications",
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

    const result = await withRetry(async () => {
      getAdminApp();
      const db = getFirestore();

      await db
        .collection("notifications")
        .doc(userId)
        .collection("items")
        .add({
          title,
          body,
          read: false,
          createdAt: Timestamp.now(),
        });

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
