"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import { parseClaims, canAccessKitchen, canAccessDriverDashboard, canAccessAdmin } from "@/lib/auth/tokenClaimsHelper";
import { Loader2 } from "lucide-react";

interface WithRoleGuardProps {
  children: React.ReactNode;
  routeType: "kitchen" | "driver" | "admin";
}

export function WithRoleGuard({ children, routeType }: WithRoleGuardProps) {
  const { user, claims, loading, refreshClaims } = useAuth();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function verifyAccess() {
      if (loading) return;

      if (!user) {
        router.replace(`/login?redirect=/${routeType}`);
        return;
      }

      let currentClaims = parseClaims({ claims } as any);
      let allowed = false;

      const checkAccess = (c: any) => {
        if (routeType === "kitchen") return canAccessKitchen(c);
        if (routeType === "driver") return canAccessDriverDashboard(c);
        if (routeType === "admin") return canAccessAdmin(c);
        return false;
      };

      if (!checkAccess(currentClaims)) {
        // Attempt a force refresh in case the token is stale
        try {
          await refreshClaims();
          // The context update might take a cycle, so we can't reliably read 'claims' here synchronously.
          // But verifyAuth/refreshClaims updates the Firebase user token, so we can decode it directly or just trust the next render.
          // For UX safety, if it still fails on the next render, it redirects.
        } catch (e) {
          console.error("Failed to refresh claims", e);
        }
      }

      // Re-evaluate
      currentClaims = parseClaims({ claims } as any);
      if (!checkAccess(currentClaims)) {
        if (mounted) router.replace("/");
        return;
      }

      if (mounted) setIsVerifying(false);
    }

    verifyAccess();

    return () => {
      mounted = false;
    };
  }, [user, claims, loading, routeType, router, refreshClaims]);

  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return <>{children}</>;
}
