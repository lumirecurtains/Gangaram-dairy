// ============================================================
// Storage Utility — Gangaram
// FIX-002 — Delivery Proof Upload
// ============================================================

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

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
): Promise<UploadResult> {
  try {
    // Convert base64 to Blob
    const response = await fetch(base64DataUri);
    const blob = await response.blob();

    // Validate file type
    if (!blob.type.startsWith("image/")) {
      return {
        success: false,
        error: "Invalid file type. Must be an image.",
      };
    }

    // Validate file size (max 5MB for Storage)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (blob.size > MAX_SIZE_BYTES) {
      return {
        success: false,
        error: "Image too large. Max 5MB allowed.",
      };
    }

    // Create storage path: delivery-proofs/{orderId}/{uniqueId}.jpg
    const fileExtension = blob.type.split("/")[1] || "jpg";
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
    };
  } catch (err: any) {
    console.error("Delivery proof upload error:", err);
    return {
      success: false,
      error: err.message || "Failed to upload delivery proof",
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
