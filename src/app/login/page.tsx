"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import { OTPLogin } from "@/lib/components/auth/OTPLogin";
import { Navbar } from "@/lib/components/layout/Navbar";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const getRedirectPath = () => {
    if (typeof window === 'undefined') return '/';
    return sessionStorage.getItem('loginRedirect') || '/';
  };

  useEffect(() => {
    if (!loading && user) {
      const redirect = getRedirectPath();
      sessionStorage.removeItem('loginRedirect');
      router.push(redirect);
    }
  }, [user, loading, router]);

  const handleLoginSuccess = () => {
    const redirect = getRedirectPath();
    sessionStorage.removeItem('loginRedirect');
    router.push(redirect);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <OTPLogin onSuccess={handleLoginSuccess} />
      </main>
    </div>
  );
}