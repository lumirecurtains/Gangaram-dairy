"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import { OTPLogin } from "@/lib/components/auth/OTPLogin";
import { Navbar } from "@/lib/components/layout/Navbar";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { user, loading, logout, refreshClaims } = useAuth();
  const router = useRouter();
  const [resolvingRole, setResolvingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      resolveUserRoleAndRedirect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const resolveUserRoleAndRedirect = async () => {
    setResolvingRole(true);
    setRoleError(null);

    try {
      // 1. Force backend to verify user against Firestore (roleAssignments & users.isBanned)
      const token = await user!.getIdToken();
      const res = await fetch("/api/v1/auth/refresh-claims", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Authentication blocked by server.");
      }

      // 2. Update client session with the newly injected claims
      await refreshClaims();
      const tokenResult = await user!.getIdTokenResult(true);
      const claims = tokenResult.claims;

      // 3. Evaluate the verified claims
      const isSuperAdmin = !!claims.super_admin;
      const isSupportAgent = !!claims.support_agent;
      const isHotelAdmin = !!claims.hotel_admin;
      const isMerchantStaff = !!claims.merchant_staff;
      const isRider = !!claims.rider;

      let targetRoute = "/"; // Default: customer
      
      if (isSuperAdmin || isSupportAgent) {
        targetRoute = "/admin";
      } else if (isHotelAdmin) {
        targetRoute = "/hotel";
      } else if (isMerchantStaff) {
        targetRoute = "/kitchen";
      } else if (isRider) {
        targetRoute = "/driver";
      }

      // 4. Session redirection
      let finalRedirect = targetRoute;
      const storedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("loginRedirect") : null;
      if (storedRedirect && storedRedirect.startsWith("/")) {
        finalRedirect = storedRedirect;
        sessionStorage.removeItem("loginRedirect");
      }

      router.push(finalRedirect);

    } catch (err: any) {
      console.error("Role resolution failed:", err);
      // Clean up session if verification failed (e.g., banned)
      await logout();
      setRoleError(err.message || "Failed to resolve account permissions. Please try again.");
      setResolvingRole(false);
    }
  };

  if (loading || resolvingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
        {resolvingRole && (
          <p className="text-sm font-medium animate-pulse" style={{ color: "var(--text-secondary)" }}>
            Securing session & verifying access...
          </p>
        )}
      </div>
    );
  }

  if (user) return null; // Prevent UI flash before routing completes

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm mx-auto">
          {roleError && (
            <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-50 text-red-600 border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{roleError}</p>
            </div>
          )}
          <OTPLogin />
        </div>
      </main>
    </div>
  );
}