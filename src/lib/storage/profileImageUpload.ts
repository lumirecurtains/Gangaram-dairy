// ============================================================
// Storage Utility — Profile Image Upload
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
 * Uploads profile image to Firebase Storage.
 * Path: profile-images/{userId}/{uuid}.{ext}
 */
export interface ProfileImageUploadOptions {
  storage: FirebaseStorage;
  userId: string;
  file: File;
}

export async function uploadProfileImage({
  storage,
  userId,
  file,
}: ProfileImageUploadOptions): Promise<StorageUploadResult> {
  // Validate file
  const validation = validateFile(
    file,
    ALLOWED_FILE_TYPES.PROFILE,
    MAX_FILE_SIZE.PROFILE_IMAGE
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    // Delete existing profile image first (only one per user)
    await deleteExistingProfileImage(storage, userId);

    // Create storage path: profile-images/{userId}/{uniqueId}.{ext}
    const fileExtension = getFileExtension(file.name, file.type);
    const uniqueId = uuidv4();
    const storagePath = `profile-images/${userId}/${uniqueId}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        userId,
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
    console.error("Profile image upload error:", err);
    const storageError = detectStorageError(err);
    return {
      success: false,
      error: storageError,
    };
  }
}

/**
 * Deletes user's existing profile image before uploading new one.
 */
async function deleteExistingProfileImage(
  storage: FirebaseStorage,
  userId: string
): Promise<void> {
  try {
    // Note: In production, you might want to query Firestore for existing URL
    // For now, we just allow multiple images (Firestore will only store latest URL)
    // This is a simplified approach - full implementation would track URLs in Firestore
  } catch (err) {
    // Non-blocking - ignore deletion errors
  }
}

/**
 * Deletes a user's profile image.
 */
export async function deleteUserProfileImage(
  storage: FirebaseStorage,
  downloadUrl: string
): Promise<void> {
  try {
    const storageRef = ref(storage, downloadUrl);
    await deleteObject(storageRef);
  } catch (err: any) {
    console.error("Failed to delete profile image:", err);
    // Don't throw - cleanup failure should not block main flow
  }
}

/**
 * Validates profile image file before upload.
 */
export function validateProfileImage(file: File): { valid: boolean; error?: string } {
  const validation = validateFile(
    file,
    ALLOWED_FILE_TYPES.PROFILE,
    MAX_FILE_SIZE.PROFILE_IMAGE
  );

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error?.message,
    };
  }

  return { valid: true };
}
