// ============================================================
// Storage Utility — Merchant Certificate Upload
// DEC-001 — FSSAI & GST Certificate Upload
// ============================================================

import {
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface CertificateUploadOptions {
  storage: FirebaseStorage;
  merchantId: string;
  certificateType: "fssai" | "gst";
  file: File;
}

/**
 * Uploads merchant certificate to Firebase Storage.
 */
export async function uploadCertificate({
  storage,
  merchantId,
  certificateType,
  file,
}: CertificateUploadOptions): Promise<UploadResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Only PDF, JPG, and PNG are allowed.",
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: "File too large. Max 5MB allowed.",
      };
    }

    // Create storage path: merchant-certificates/{merchantId}/{type}/{uniqueId}.{ext}
    const fileExtension = file.name.split(".").pop() || file.type.split("/")[1] || "pdf";
    const uniqueId = uuidv4();
    const storagePath = `merchant-certificates/${merchantId}/${certificateType}/${uniqueId}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        merchantId,
        certificateType,
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
    console.error("Certificate upload error:", err);
    return {
      success: false,
      error: err.message || "Failed to upload certificate",
    };
  }
}

/**
 * Validates certificate file before upload.
 */
export function validateCertificateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only PDF, JPG, and PNG are allowed.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "File too large. Max 5MB allowed.",
    };
  }

  return { valid: true };
}
