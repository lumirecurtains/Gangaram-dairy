// ============================================================
// Storage Utility — Marketing Asset Upload
// DEBT-001 — Official Image Hosting Strategy
// ============================================================

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
  StorageUploadResult,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  validateFile,
  getFileExtension,
  detectStorageError,
} from "./storageConfig";

/**
 * Uploads marketing asset (banner, campaign image) to Firebase Storage.
 * Path: marketing/{merchantId}/{assetType}/{uuid}.{ext}
 */
export interface MarketingAssetUploadOptions {
  storage: FirebaseStorage;
  merchantId: string;
  assetType: "banner" | "campaign" | "featured";
  file: File;
}

export async function uploadMarketingAsset({
  storage,
  merchantId,
  assetType,
  file,
}: MarketingAssetUploadOptions): Promise<StorageUploadResult> {
  // Validate file
  const validation = validateFile(
    file,
    ALLOWED_FILE_TYPES.MARKETING,
    MAX_FILE_SIZE.MARKETING_ASSET
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    // Create storage path: marketing/{merchantId}/{assetType}/{uniqueId}.{ext}
    const fileExtension = getFileExtension(file.name, file.type);
    const uniqueId = uuidv4();
    const storagePath = `marketing/${merchantId}/${assetType}/${uniqueId}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        merchantId,
        assetType,
        uploadedAt: new Date().toISOString(),
        originalFilename: file.name,
      },
    });

    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      downloadUrl,
      storagePath,
    };
  } catch (err: any) {
    console.error("Marketing asset upload error:", err);
    const storageError = detectStorageError(err);
    return {
      success: false,
      error: storageError,
    };
  }
}

/**
 * Deletes a marketing asset.
 */
export async function deleteMarketingAsset(
  storage: FirebaseStorage,
  downloadUrl: string
): Promise<void> {
  try {
    const storageRef = ref(storage, downloadUrl);
    await deleteObject(storageRef);
  } catch (err: any) {
    console.error("Failed to delete marketing asset:", err);
    // Don't throw - cleanup failure should not block main flow
  }
}

/**
 * Validates marketing asset file before upload.
 */
export function validateMarketingAsset(file: File): { valid: boolean; error?: string } {
  const validation = validateFile(
    file,
    ALLOWED_FILE_TYPES.MARKETING,
    MAX_FILE_SIZE.MARKETING_ASSET
  );

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error?.message,
    };
  }

  return { valid: true };
}
