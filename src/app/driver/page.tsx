"use client";

import { useEffect, useState, useCallback } from "react";
import { useRider, useAuth } from "@/lib/contexts";
import { JobCard } from "@/lib/components/driver/JobCard";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";
import { Skeleton } from "@/lib/components/common/Skeleton";
import { subscribeToAvailableJobs, subscribeToMyDeliveries, acceptJobTransaction } from "@/lib/api/driver";
import { Order } from "@/lib/firestoreSchema";
import { KITCHEN_CONFIG } from "@/lib/config/constants";
import { Loader2, Bike, PackageCheck, AlertCircle, WifiOff, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DriverDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { riderId, isRider } = useRider();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"available" | "my_deliveries">("available");
  
  const [availableJobs, setAvailableJobs] = useState<(Order & { id: string })[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<(Order & { id: string })[]>([]);
  
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  // PIN Modal State
  const [pinModalOrderId, setPinModalOrderId] = useState<string | null>(null);
  const [deliveryPin, setDeliveryPin] = useState("");
  const [submittingPin, setSubmittingPin] = useState(false);

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/driver");
    }
  }, [user, authLoading, router]);

  // Data Fetching
  useEffect(() => {
    // Note: We use DEMO_MERCHANT_ID temporarily for available jobs until we have geo-fencing or strict assignment
    const unsubJobs = subscribeToAvailableJobs(KITCHEN_CONFIG.DEMO_MERCHANT_ID, (jobs, offline) => {
      setAvailableJobs(jobs);
      setIsOffline(offline);
      setLoadingJobs(false);
    });

    return () => unsubJobs();
  }, []);

  useEffect(() => {
    if (!riderId) {
      setLoadingDeliveries(false);
      return;
    }

    const unsubDeliveries = subscribeToMyDeliveries(riderId, (deliveries, offline) => {
      setMyDeliveries(deliveries);
      setIsOffline(offline);
      setLoadingDeliveries(false);
    });

    return () => unsubDeliveries();
  }, [riderId]);

  const handleAcceptJob = useCallback(async (orderId: string) => {
    if (!riderId || !isRider) {
      showToast("You must be an authorized rider to accept jobs.", "error");
      return;
    }

    setTransitioningId(orderId);
    try {
      await acceptJobTransaction(orderId, riderId);
      showToast("Job accepted successfully!", "success");
      setActiveTab("my_deliveries");
    } catch (err: any) {
      showToast(err.message || "Failed to accept job", "error");
    } finally {
      setTransitioningId(null);
    }
  }, [riderId, isRider]);

  const handleOpenPinModal = (orderId: string) => {
    setDeliveryPin("");
    setPinModalOrderId(orderId);
  };

  const handleSubmitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalOrderId || deliveryPin.length !== 4) {
      showToast("Please enter a valid 4-digit PIN", "error");
      return;
    }

    setSubmittingPin(true);
    try {
      const res = await fetch(`/api/v1/orders/${pinModalOrderId}/delivery/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify PIN");
      }

      showToast("Delivery successfully completed!", "success");
      setPinModalOrderId(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmittingPin(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!user) return null;

  if (!isRider) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Your account does not have rider privileges. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      {/* Network Status */}
      {isOffline && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 text-red-600 font-semibold border border-red-200">
          <WifiOff className="w-5 h-5" />
          <span>You are offline. Reconnecting...</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] mb-6 shadow-sm">
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "available" ? "shadow-md" : ""
          }`}
          style={{
            background: activeTab === "available" ? "var(--bg)" : "transparent",
            color: activeTab === "available" ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          <Bike className="w-4 h-4" />
          Available Jobs
          {availableJobs.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: "var(--primary)", color: "white" }}
            >
              {availableJobs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("my_deliveries")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "my_deliveries" ? "shadow-md" : ""
          }`}
          style={{
            background: activeTab === "my_deliveries" ? "var(--bg)" : "transparent",
            color: activeTab === "my_deliveries" ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          <PackageCheck className="w-4 h-4" />
          My Deliveries
          {myDeliveries.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: "var(--border)", color: "var(--text)" }}
            >
              {myDeliveries.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6 space-y-4">
        {activeTab === "available" && (
          <>
            {loadingJobs ? (
              <div className="space-y-4">
                <Skeleton className="w-full h-40 rounded-xl" />
                <Skeleton className="w-full h-40 rounded-xl" />
              </div>
            ) : availableJobs.length === 0 ? (
              <div className="text-center py-16">
                <Bike
                  className="w-12 h-12 mx-auto mb-3 opacity-30"
                  style={{ color: "var(--text-secondary)" }}
                />
                <p className="font-medium text-lg">No available jobs</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  Waiting for kitchen to prepare orders...
                </p>
              </div>
            ) : (
              availableJobs.map((order) => (
                <JobCard
                  key={order.id}
                  orderId={order.id}
                  status={order.status}
                  items={order.items}
                  grandTotal={order.grandTotal}
                  deliveryAddress={order.deliveryAddress}
                  deliveryFee={order.deliveryFee}
                  createdAt={order.createdAt as any}
                  riderId={order.riderId}
                  currentUserId={riderId!}
                  isMyJob={false}
                  onAccept={() => handleAcceptJob(order.id)}
                  isTransitioning={transitioningId === order.id}
                />
              ))
            )}
          </>
        )}

        {activeTab === "my_deliveries" && (
          <>
            {loadingDeliveries ? (
              <div className="space-y-4">
                <Skeleton className="w-full h-40 rounded-xl" />
                <Skeleton className="w-full h-40 rounded-xl" />
              </div>
            ) : myDeliveries.length === 0 ? (
              <div className="text-center py-16">
                <PackageCheck
                  className="w-12 h-12 mx-auto mb-3 opacity-30"
                  style={{ color: "var(--text-secondary)" }}
                />
                <p className="font-medium text-lg">No active deliveries</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  Accept a job from the Available tab to start earning.
                </p>
              </div>
            ) : (
              myDeliveries.map((order) => (
                <JobCard
                  key={order.id}
                  orderId={order.id}
                  status={order.status}
                  items={order.items}
                  grandTotal={order.grandTotal}
                  deliveryAddress={order.deliveryAddress}
                  deliveryFee={order.deliveryFee}
                  createdAt={order.createdAt as any}
                  riderId={order.riderId}
                  currentUserId={riderId!}
                  isMyJob={true}
                  onMarkDelivered={() => handleOpenPinModal(order.id)}
                  isTransitioning={transitioningId === order.id}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* PIN Verification Modal */}
      {pinModalOrderId && (
        <Modal
          isOpen={true}
          onClose={() => setPinModalOrderId(null)}
          title="Verify Delivery PIN"
        >
          <form onSubmit={handleSubmitPin} className="space-y-6">
            <div className="text-center">
              <p style={{ color: "var(--text-secondary)" }}>
                Ask the customer for the 4-digit PIN to confirm delivery.
              </p>
            </div>
            
            <div className="flex justify-center">
              <input
                type="text"
                maxLength={4}
                value={deliveryPin}
                onChange={(e) => setDeliveryPin(e.target.value.replace(/\D/g, ""))}
                className="text-center text-4xl tracking-widest font-mono font-bold w-48 py-4 rounded-xl outline-none transition-all"
                style={{
                  background: "var(--bg)",
                  border: "2px solid var(--border)",
                  color: "var(--text)",
                }}
                placeholder="••••"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={submittingPin || deliveryPin.length !== 4}
              className="w-full py-4 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{ background: "var(--primary)" }}
            >
              {submittingPin ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
              ) : (
                "Complete Delivery"
              )}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
