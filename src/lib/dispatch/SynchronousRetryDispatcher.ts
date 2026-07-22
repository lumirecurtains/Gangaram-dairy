// ============================================================
// SYNCHRONOUS RETRY DISPATCHER — Gangaram
// Module 10 + Module 12 — Default dispatcher using channel senders
// 3 attempts with 500ms / 2s delays, never throws
// Logs failures to /dispatchFailures
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import type { NotificationDispatcher } from "./NotificationDispatcher";
import type { DispatchJob, DispatchResult } from "./types";
import { WhatsAppChannelSender } from "./channels/WhatsAppChannelSender";
import { SmsChannelSender } from "./channels/SmsChannelSender";
import { PushChannelSender } from "./channels/PushChannelSender";
import { InAppChannelSender } from "./channels/InAppChannelSender";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CHANNEL_SENDERS = {
  whatsapp_notify: new WhatsAppChannelSender(),
  sms_notify: new SmsChannelSender(),
  push_notify: new PushChannelSender(),
  in_app_notify: new InAppChannelSender(),
};

/**
 * Default dispatcher that routes jobs to their channel senders.
 * Each sender manages its own retry logic via withRetry.
 * Failed jobs are recorded to /dispatchFailures.
 * Never throws.
 */
export class SynchronousRetryDispatcher implements NotificationDispatcher {
  private maxAttempts = 3;

  constructor(maxAttempts?: number) {
    if (maxAttempts && maxAttempts > 0) {
      this.maxAttempts = maxAttempts;
    }
  }

  async dispatch(job: DispatchJob): Promise<DispatchResult> {
    const sender = CHANNEL_SENDERS[job.type];
    if (!sender) {
      await this.recordFailure(job, `No sender for job type: ${job.type}`);
      return {
        success: false,
        jobId: job.id,
        jobType: job.type,
        attempts: 0,
        lastError: `No sender configured for type: ${job.type}`,
      };
    }

    const result = await sender.send(job);

    // Log to dispatchFailures if all attempts failed
    if (!result.success) {
      await this.recordFailure(job, result.lastError);
    }

    return result;
  }

  async dispatchAll(jobs: DispatchJob[]): Promise<DispatchResult[]> {
    return Promise.all(jobs.map((job) => this.dispatch(job)));
  }

  private async recordFailure(job: DispatchJob, error: string | null): Promise<void> {
    try {
      getAdminApp();
      const db = getFirestore();

      await db.collection("dispatchFailures").add({
        jobType: job.type,
        payload: job.payload,
        lastError: error,
        attemptCount: this.maxAttempts,
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to record dispatch failure:", err);
    }
  }
}
