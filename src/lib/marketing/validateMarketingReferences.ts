// ============================================================
// Marketing Entity Reference Validator
// Validates that all linked references in marketing entities
// exist and belong to the same merchant.
// ============================================================

import { getFirestore } from "firebase-admin/firestore";

export interface ValidationContext {
  db: FirebaseFirestore.Firestore;
  targetMerchantId: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a banner's linkTarget based on its linkType.
 * - linkType "product": validates menu item exists and belongs to merchant
 * - linkType "category": validates category exists in merchant's menu (no-op, categories are implicit)
 * - linkType "coupon": validates coupon exists and merchantId matches (or is null for global)
 * - linkType "none": no validation needed
 */
export async function validateBannerReferences(
  banner: { linkType: string; linkTarget?: string | null },
  context: ValidationContext
): Promise<ValidationResult> {
  const { db, targetMerchantId } = context;

  if (banner.linkType === "none" || !banner.linkTarget) {
    return { valid: true };
  }

  if (banner.linkType === "product") {
    const menuRef = db.collection(`merchants/${targetMerchantId}/menus`).doc(banner.linkTarget);
    const menuSnap = await menuRef.get();
    if (!menuSnap.exists) {
      return { valid: false, error: `Referenced product ${banner.linkTarget} does not exist in this merchant's menu` };
    }
    return { valid: true };
  }

  if (banner.linkType === "category") {
    // Categories are implicit strings derived from menu items, not separate documents.
    // No cross-merchant risk since category names are text, not IDs.
    return { valid: true };
  }

  if (banner.linkType === "coupon") {
    const couponRef = db.collection("coupons").doc(banner.linkTarget);
    const couponSnap = await couponRef.get();
    if (!couponSnap.exists) {
      return { valid: false, error: `Referenced coupon ${banner.linkTarget} does not exist` };
    }
    const couponData = couponSnap.data()!;
    if (couponData.merchantId !== null && couponData.merchantId !== targetMerchantId) {
      return { valid: false, error: `Referenced coupon ${banner.linkTarget} does not belong to this merchant` };
    }
    return { valid: true };
  }

  return { valid: false, error: `Unknown banner linkType: ${banner.linkType}` };
}

/**
 * Validates a featured section's itemIds array.
 * Each item ID must exist in the merchant's menu and belong to the same merchant.
 */
export async function validateFeaturedSectionReferences(
  itemIds: string[],
  context: ValidationContext
): Promise<ValidationResult> {
  const { db, targetMerchantId } = context;

  if (!itemIds || itemIds.length === 0) {
    return { valid: true };
  }

  const menuRef = db.collection(`merchants/${targetMerchantId}/menus`);
  
  for (const itemId of itemIds) {
    const itemSnap = await menuRef.doc(itemId).get();
    if (!itemSnap.exists) {
      return { valid: false, error: `Referenced product ${itemId} does not exist in this merchant's menu` };
    }
  }

  return { valid: true };
}

/**
 * Validates a campaign's bannerIds, couponIds, and featuredSectionIds arrays.
 * Each referenced entity must exist and belong to the same merchant (or be global for coupons).
 */
export async function validateCampaignReferences(
  refs: {
    bannerIds?: string[];
    couponIds?: string[];
    featuredSectionIds?: string[];
  },
  context: ValidationContext
): Promise<ValidationResult> {
  const { db, targetMerchantId } = context;

  // Validate banner references
  const bannerIds = refs.bannerIds || [];
  if (bannerIds.length > 0) {
    const bannersRef = db.collection(`merchants/${targetMerchantId}/banners`);
    for (const bid of bannerIds) {
      const bannerSnap = await bannersRef.doc(bid).get();
      if (!bannerSnap.exists) {
        return { valid: false, error: `Referenced banner ${bid} does not exist in this merchant's banners` };
      }
      const bannerData = bannerSnap.data()!;
      if (bannerData.merchantId !== targetMerchantId) {
        return { valid: false, error: `Referenced banner ${bid} does not belong to this merchant` };
      }
    }
  }

  // Validate coupon references
  const couponIds = refs.couponIds || [];
  if (couponIds.length > 0) {
    for (const cid of couponIds) {
      const couponSnap = await db.collection("coupons").doc(cid).get();
      if (!couponSnap.exists) {
        return { valid: false, error: `Referenced coupon ${cid} does not exist` };
      }
      const couponData = couponSnap.data()!;
      if (couponData.merchantId !== null && couponData.merchantId !== targetMerchantId) {
        return { valid: false, error: `Referenced coupon ${cid} does not belong to this merchant` };
      }
    }
  }

  // Validate featured section references
  const fsIds = refs.featuredSectionIds || [];
  if (fsIds.length > 0) {
    const fsRef = db.collection(`merchants/${targetMerchantId}/featuredSections`);
    for (const fsid of fsIds) {
      const fsSnap = await fsRef.doc(fsid).get();
      if (!fsSnap.exists) {
        return { valid: false, error: `Referenced featured section ${fsid} does not exist in this merchant's featured sections` };
      }
      const fsData = fsSnap.data()!;
      if (fsData.merchantId !== targetMerchantId) {
        return { valid: false, error: `Referenced featured section ${fsid} does not belong to this merchant` };
      }
    }
  }

  return { valid: true };
}

/**
 * Unified entry point for marketing entity reference validation.
 */
export async function validateMarketingReferences(
  entityType: "banner" | "featuredSection" | "campaign",
  entityData: any,
  context: ValidationContext
): Promise<ValidationResult> {
  switch (entityType) {
    case "banner":
      return validateBannerReferences(entityData, context);
    case "featuredSection":
      return validateFeaturedSectionReferences(entityData.itemIds || [], context);
    case "campaign":
      return validateCampaignReferences(entityData, context);
    default:
      return { valid: false, error: `Unknown entity type: ${entityType}` };
  }
}
