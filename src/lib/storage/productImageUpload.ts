// ============================================================
// Storage Utility — Product Image Upload
// DEBT-001 — Official Image Hosting Strategy
// ============================================================

import {
  ref,
  uploadBytes,
  getDownloadURL,
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
 * Uploads product image to Firebase Storage.
 * Path: products/{merchantId}/{itemId}/{uuid}.{ext}
 */
export interface ProductImageUploadOptions {
  storage: FirebaseStorage;
  merchantId: string;
  itemId: string;
  file: File;
}

export async function uploadProductImage({
  storage,
  merchantId,
  itemId,
  file,
}: ProductImageUploadOptions): Promise<StorageUploadResult> {
  // Validate file
  const validation = validateFile(
    file,
    ALLOWED_FILE_TYPES.IMAGE,
    MAX_FILE_SIZE.PRODUCT_IMAGE
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    // Create storage path: products/{merchantId}/{itemId}/{uniqueId}.{ext}
    const fileExtension = getFileExtension(file.name, file.type);
    const uniqueId = uuidv4();
    const storagePath = `products/${merchantId}/${itemId}/${uniqueId}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        merchantId,
        itemId,
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
    console.error("Product image upload error:", err);
    const storageError = detectStorageError(err);
    return {
      success: false,
      error: storageError,
    };
  }
}

/**
 * Validates product image file before upload.
 */
export function validateProductImage(file: File): { valid: boolean; error?: string } {
  const validation = validateFile(
    file,
    ALLOWED_FILE_TYPES.IMAGE,
    MAX_FILE_SIZE.PRODUCT_IMAGE
  );

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error?.message,
    };
  }

  return { valid: true };
}
