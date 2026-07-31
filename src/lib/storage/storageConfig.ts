// ============================================================
// FIREBASE STORAGE CONFIGURATION — Official Strategy (DEBT-001)
// Version 2 — Standardized Image & Media Storage
// ============================================================
//
// This module centralizes Firebase Storage configuration and
// provides standardized utilities for all media uploads.
//
// OFFICIAL STORAGE LAYERS:
// - Product Images
// - Merchant Certificates
// - Delivery Proof Images
// - Profile Images
// - Marketing Assets (Banners, Campaigns)
//
// SECURITY:
// - All uploads require authentication
// - Path namespacing prevents unauthorized access
// - UUID-based naming prevents filename collisions
// - File type and size validation enforced
//
// FUTURE-READY:
// - Graceful error handling if Storage is disabled
// - Meaningful error messages for retry scenarios
// - No Firestore corruption on Storage failures
// ============================================================

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  FirebaseStorage,
  UploadResult as FirebaseUploadResult,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// STORAGE FOLDER STRUCTURE (Official Version 2)
// ============================================================
//
// gangaram-storage/
// ├── products/
// │   └── {merchantId}/
// │       └── {itemId}/
// │           └── {uuid}.{ext}
// │
// ├── merchant-certificates/
// │   └── {merchantId}/
// │       ├── fssai/
// │       │   └── {uuid}.{ext}
// │       └── gst/
// │           └── {uuid}.{ext}
// │
// ├── delivery-proofs/
// │   └── {orderId}/
// │       └── {uuid}.{ext}
// │
// ├── profile-images/
// │   └── {userId}/
// │       └── {uuid}.{ext}
// │
// └── marketing/
//     └── {merchantId}/
//         ├── banners/
//         │   └── {uuid}.{ext}
//         └── campaigns/
//             └── {uuid}.{ext}
// ============================================================

export const STORAGE_PATHS = {
  PRODUCTS: "products",
  MERCHANT_CERTIFICATES: "merchant-certificates",
  DELIVERY_PROOFS: "delivery-proofs",
  PROFILE_IMAGES: "profile-images",
  MARKETING: "marketing",
} as const;

// ============================================================
// FILE TYPE ALLOWLIST BY CATEGORY
// ============================================================

export const ALLOWED_FILE_TYPES = {
  IMAGE: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  DOCUMENT: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
  PROFILE: ["image/jpeg", "image/jpg", "image/png"],
  MARKETING: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
} as const;

// ============================================================
// FILE SIZE LIMITS (Bytes)
// ============================================================

export const MAX_FILE_SIZE = {
  PRODUCT_IMAGE: 2 * 1024 * 1024,       // 2MB
  CERTIFICATE: 5 * 1024 * 1024,          // 5MB
  DELIVERY_PROOF: 5 * 1024 * 1024,       // 5MB
  PROFILE_IMAGE: 2 * 1024 * 1024,        // 2MB
  MARKETING_ASSET: 5 * 1024 * 1024,      // 5MB
} as const;

// ============================================================
// UPLOAD RESULT INTERFACE
// ============================================================

export interface StorageUploadResult {
  success: boolean;
  downloadUrl?: string;
  storagePath?: string;
  error?: StorageError;
}

export type StorageErrorCode =
  | "STORAGE_DISABLED"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "UNAUTHORIZED"
  | "PERMISSION_DENIED"
  | "UPLOAD_FAILED"
  | "UNKNOWN";

export interface StorageError {
  code: StorageErrorCode;
  message: string;
  retryable: boolean;
}

// ============================================================
// STORAGE ERROR DETECTION
// ============================================================

/**
 * Detects Firebase Storage errors and provides user-friendly messages.
 * Critical for handling Storage-disabled scenarios gracefully.
 */
export function detectStorageError(error: any): StorageError {
  const errorCode = error?.code || error?.message || "";
  
  // Firebase Storage not enabled / service unavailable
  if (
    errorCode.includes("storage/server") ||
    errorCode.includes("storage/unknown") ||
    errorCode.includes("403") ||
    errorCode.includes("storage/unauthorized")
  ) {
    return {
      code: "STORAGE_DISABLED",
      message: "File storage is currently unavailable. Please try again later.",
      retryable: true,
    };
  }

  // Permission denied
  if (
    errorCode.includes("permission-denied") ||
    errorCode.includes("unauthorized")
  ) {
    return {
      code: "UNAUTHORIZED",
      message: "You do not have permission to upload files.",
      retryable: false,
    };
  }

  // Network or server error
  if (
    errorCode.includes("network") ||
    errorCode.includes("timeout") ||
    errorCode.includes("server")
  ) {
    return {
      code: "UPLOAD_FAILED",
      message: "Upload failed due to a network error. Please try again.",
      retryable: true,
    };
  }

  // File too large
  if (errorCode.includes("quota-exceeded") || errorCode.includes("size")) {
    return {
      code: "FILE_TOO_LARGE",
      message: "File exceeds the maximum allowed size.",
      retryable: false,
    };
  }

  // Default unknown error
  return {
    code: "UNKNOWN",
    message: error?.message || "An unexpected error occurred during upload.",
    retryable: true,
  };
}

// ============================================================
// FILENAME GENERATION STRATEGY
// ============================================================

/**
 * Generates a unique, collision-resistant filename.
 * Strategy: UUID + optional timestamp component
 * NEVER uses user-provided filenames for security.
 */
export function generateUniqueFilename(
  originalFilename: string,
  includeTimestamp: boolean = false
): string {
  const extension = originalFilename.split(".").pop() || "bin";
  const uniqueId = uuidv4();
  
  if (includeTimestamp) {
    const timestamp = Date.now();
    return `${uniqueId}_${timestamp}.${extension}`;
  }
  
  return `${uniqueId}.${extension}`;
}

/**
 * Extracts file extension safely from filename or MIME type.
 */
export function getFileExtension(filename: string, mimeType?: string): string {
  // Prefer filename extension
  const filenameExt = filename.split(".").pop();
  if (filenameExt && filenameExt !== filename) {
    return filenameExt;
  }
  
  // Fallback to MIME type
  if (mimeType) {
    const mimeExt = mimeType.split("/")[1];
    if (mimeExt && mimeExt !== "*") {
      return mimeExt;
    }
  }
  
  // Default fallback
  return "bin";
}

// ============================================================
// FILE VALIDATION UTILITIES
// ============================================================

export interface ValidationResult {
  valid: boolean;
  error?: StorageError;
}

/**
 * Validates file against type and size constraints.
 */
export function validateFile(
  file: File,
  allowedTypes: readonly string[],
  maxSizeBytes: number
): ValidationResult {
  // Check file type
  const mimeType = file.type.toLowerCase();
  if (!allowedTypes.some(t => t.toLowerCase() === mimeType)) {
    return {
      valid: false,
      error: {
        code: "INVALID_FILE_TYPE",
        message: `File type "${mimeType}" is not allowed.`,
        retryable: false,
      },
    };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File too large. Maximum allowed size is ${maxSizeMB}MB.`,
        retryable: false,
      },
    };
  }

  return { valid: true };
}

// ============================================================
// CORE UPLOAD FUNCTION
// ============================================================

export interface UploadOptions {
  storage: FirebaseStorage;
  basePath: string;
  entityId?: string;         // merchantId, orderId, userId, etc.
  subPath?: string;          // Optional subfolder (e.g., "fssai", "banners")
  file: File;
  allowMultiple?: boolean;    // Reserved for future multi-upload
  includeTimestamp?: boolean; // Include timestamp in filename
  customMetadata?: Record<string, string>;
}

/**
 * Standardized file upload function with comprehensive error handling.
 * Future-ready for Storage-disabled scenarios.
 */
export async function uploadFile({
  storage,
  basePath,
  entityId,
  subPath,
  file,
  includeTimestamp = false,
  customMetadata,
}: UploadOptions): Promise<StorageUploadResult> {
  // Validate file first (client-side validation)
  const validation = validateFile(file, ALLOWED_FILE_TYPES.IMAGE, MAX_FILE_SIZE.PRODUCT_IMAGE);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    // Build storage path
    const fileExtension = getFileExtension(file.name, file.type);
    const uniqueFilename = generateUniqueFilename(file.name, includeTimestamp);
    
    // Construct path: basePath/entityId/subPath/filename
    const pathSegments = [basePath];
    if (entityId) pathSegments.push(entityId);
    if (subPath) pathSegments.push(subPath);
    pathSegments.push(uniqueFilename);
    
    const storagePath = pathSegments.join("/");
    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const metadata: Record<string, any> = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalFilename: file.name,
        fileSize: file.size.toString(),
        ...customMetadata,
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);

    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      downloadUrl,
      storagePath,
    };
  } catch (error: any) {
    const storageError = detectStorageError(error);
    
    return {
      success: false,
      error: storageError,
    };
  }
}

// ============================================================
// CORE DELETE FUNCTION
// ============================================================

/**
 * Deletes a file from Storage by URL or path.
 */
export async function deleteFile(
  storage: FirebaseStorage,
  fileUrlOrPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const storageRef = ref(storage, fileUrlOrPath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error: any) {
    console.error("File deletion error:", error);
    return {
      success: false,
      error: error?.message || "Failed to delete file",
    };
  }
}

// ============================================================
// HEALTH CHECK UTILITY
// ============================================================

/**
 * Checks if Firebase Storage is accessible.
 * Returns false if Storage is disabled or unreachable.
 */
export async function checkStorageHealth(
  storage: FirebaseStorage
): Promise<{ available: boolean; error?: string }> {
  try {
    // Attempt a lightweight operation (list root directory)
    const rootRef = ref(storage, "");
    await listAll(rootRef);
    return { available: true };
  } catch (error: any) {
    const storageError = detectStorageError(error);
    return {
      available: false,
      error: storageError.message,
    };
  }
}

// ============================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================

// Re-export existing specialized uploaders
export { uploadCertificate, validateCertificateFile } from "./certificateUpload";
export { uploadDeliveryProof, deleteDeliveryProof } from "./deliveryProofUpload";
