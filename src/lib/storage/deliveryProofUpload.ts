// ============================================================
// Storage Utility — Gangaram
// FIX-002 — Delivery Proof Upload
// DEBT-001 — Updated to use centralized storage config
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
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  validateFile,
  getFileExtension,
  detectStorageError,
  type StorageUploadResult,
} from "./storageConfig";

/**
 * Uploads delivery proof image to Firebase Storage.
 * 
 * @param storage - Firebase Storage instance
 * @param orderId - Order ID for path namespacing
 * @param base64DataUri - Base64 data URI from file input/camera
 * @returns UploadResult with downloadUrl on success
 */
export async function uploadDeliveryProof(
  storage: FirebaseStorage,
  orderId: string,
  base64DataUri: string
): Promise<StorageUploadResult> {
  try {
    // Convert base64 to Blob
    const response = await fetch(base64DataUri);
    const blob = await response.blob();

    // Validate file using centralized validation
    const validation = validateFile(
      blob as any,
      ALLOWED_FILE_TYPES.IMAGE,
      MAX_FILE_SIZE.DELIVERY_PROOF
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Create storage path: delivery-proofs/{orderId}/{uniqueId}.{ext}
    const fileExtension = getFileExtension(`upload.${blob.type.split("/")[1]}`, blob.type);
    const uniqueId = uuidv4();
    const storagePath = `delivery-proofs/${orderId}/${uniqueId}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type,
      customMetadata: {
        orderId,
        uploadedAt: new Date().toISOString(),
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
    console.error("Delivery proof upload error:", err);
    const storageError = detectStorageError(err);
    return {
      success: false,
      error: storageError,
    };
  }
}

/**
 * Deletes a delivery proof image from Storage.
 * Used for cleanup if order is cancelled or proof is replaced.
 */
export async function deleteDeliveryProof(
  storage: FirebaseStorage,
  downloadUrl: string
): Promise<void> {
  try {
    const storageRef = ref(storage, downloadUrl);
    await deleteObject(storageRef);
  } catch (err: any) {
    console.error("Failed to delete delivery proof:", err);
    // Don't throw - cleanup failure should not block main flow
  }
}
