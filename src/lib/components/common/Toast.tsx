"use client";

import toast from "react-hot-toast";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import type { ReactElement } from "react";

type ToastType = "success" | "error" | "info" | "warning";

const icons: Record<ToastType, ReactElement> = {
  success: <CheckCircle className="w-5 h-5" style={{ color: "var(--accent)" }} />,
  error: <XCircle className="w-5 h-5" style={{ color: "var(--error)" }} />,
  warning: <AlertCircle className="w-5 h-5" style={{ color: "var(--warning)" }} />,
  info: <Info className="w-5 h-5" style={{ color: "var(--primary)" }} />,
};

export function showToast(message: string, type: ToastType = "info") {
  toast(message, {
    icon: icons[type],
    duration: 4000,
    style: {
      borderRadius: "12px",
      padding: "12px 16px",
      fontSize: "14px",
      background: "var(--surface)",
      color: "var(--text)",
      border: "1px solid var(--border)",
    },
  });
}

export { toast };