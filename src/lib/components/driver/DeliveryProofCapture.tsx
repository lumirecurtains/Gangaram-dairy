"use client";

import { useState, useRef, useCallback } from "react";
import { showToast } from "@/lib/components/common/Toast";
import { Camera, Upload, X, Loader2, CheckCircle, ImageIcon } from "lucide-react";

interface DeliveryProofCaptureProps {
  onCapture: (base64DataUri: string) => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit for Firestore

export function DeliveryProofCapture({ onCapture, disabled = false }: DeliveryProofCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file", "error");
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        showToast("Image too large. Max 2MB allowed.", "error");
        return;
      }

      setCapturing(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setPreview(dataUri);
        setCapturing(false);
        onCapture(dataUri);
        showToast("Delivery proof captured", "success");
      };
      reader.onerror = () => {
        setCapturing(false);
        showToast("Failed to read image", "error");
      };
      reader.readAsDataURL(file);
    },
    [onCapture]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so same file can be reselected
      e.target.value = "";
    },
    [processFile]
  );

  const handleCameraCapture = useCallback(() => {
    // Trigger native camera on mobile via file input with capture attribute
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Preview area */}
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img
            src={preview}
            alt="Delivery proof"
            className="w-full h-48 object-cover rounded-xl"
          />
          <button
            onClick={clearPreview}
            disabled={disabled}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-all"
            aria-label="Remove proof image"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/50 text-white">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            Proof captured
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          {/* Camera capture button */}
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={disabled || capturing}
            className="flex-1 flex flex-col items-center justify-center gap-2 p-6 rounded-xl min-h-[120px] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            style={{ background: "var(--bg)", border: "2px dashed var(--border)" }}
          >
            {capturing ? (
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
            ) : (
              <>
                <Camera className="w-8 h-8" style={{ color: "var(--primary)" }} />
                <span className="text-sm font-medium">Take Photo</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Capture delivery proof
                </span>
              </>
            )}
          </button>

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || capturing}
            className="flex-1 flex flex-col items-center justify-center gap-2 p-6 rounded-xl min-h-[120px] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            style={{ background: "var(--bg)", border: "2px dashed var(--border)" }}
          >
            <Upload className="w-8 h-8" style={{ color: "var(--primary)" }} />
            <span className="text-sm font-medium">Upload</span>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Gallery or file
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
