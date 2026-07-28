import { Campaign } from "@/lib/firestoreSchema";

export type ResolvedCampaignStatus = "Draft" | "Scheduled" | "Active" | "Expired" | "Disabled";

/**
 * Resolves the true operational status of a campaign dynamically
 * based on its configured boolean, manual status string, and current time bounds.
 */
export function resolveCampaignStatus(
  campaign: Partial<Campaign>,
  currentTimeMs: number = Date.now()
): ResolvedCampaignStatus {
  // Manual overrides
  if (!campaign.isActive) return "Disabled";
  if (campaign.status === "cancelled") return "Disabled";
  if (campaign.status === "completed") return "Expired";
  
  // Safely parse Firebase Timestamps or plain objects depending on context (Client vs Server)
  const startMs = (campaign.startDate as any)?._seconds 
    ? (campaign.startDate as any)._seconds * 1000 
    : (campaign.startDate as any)?.toMillis?.() || 0;
    
  const endMs = (campaign.endDate as any)?._seconds 
    ? (campaign.endDate as any)._seconds * 1000 
    : (campaign.endDate as any)?.toMillis?.() || 0;

  if (startMs === 0 || endMs === 0) return "Draft";

  if (currentTimeMs < startMs) return "Scheduled";
  if (currentTimeMs > endMs) return "Expired";

  return "Active";
}
