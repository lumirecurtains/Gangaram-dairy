"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, Store, FileText, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { validateCertificateFile } from "@/lib/storage/certificateUpload";

export default function OnboardingPage() {
  const { user, claims } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [fssai, setFssai] = useState("");
  const [gst, setGst] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkExistingApplication() {
      if (!user) return;

      // If user is already an approved merchant staff, redirect to kitchen
      if ((claims as any)?.merchant_staff && (claims as any)?.merchantId) {
        router.replace("/kitchen");
        return;
      }

      try {
        const db = getFirebaseFirestore();
        const q = query(
          collection(db, "merchants"),
          where("ownerUid", "==", user.uid),
          limit(1)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const data = snap.docs[0].data();
          setMerchantId(snap.docs[0].id);
          setStatus(data.onboardingStatus);
          setRejectionReason(data.rejectionReason || null);

          if (data.onboardingStatus === "DRAFT") setStep(2);
          else setStep(3);
        }
      } catch (err: any) {
        showToast("Failed to load application status", "error");
      } finally {
        setLoading(false);
      }
    }

    checkExistingApplication();
  }, [user, claims, router]);

  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify({ name, slug, city }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMerchantId(data.merchantId);
      setStatus("DRAFT");
      setStep(2);
      showToast("Basic details saved!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fssaiFile || !gstFile) {
      showToast("Please upload both FSSAI and GST certificates", "error");
      return;
    }

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      
      const formData = new FormData();
      formData.append("merchantId", merchantId!);
      formData.append("fssaiNumber", fssai);
      formData.append("gstNumber", gst);
      formData.append("fssaiCertificate", fssaiFile);
      formData.append("gstCertificate", gstFile);

      const res = await fetch("/api/v1/onboarding/submit-docs", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus("PENDING_VERIFICATION");
      setStep(3);
      showToast("Application submitted for review!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-12">
      <div className="text-center mb-10">
        <Store className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--primary)" }} />
        <h1 className="text-2xl font-bold">Restaurant Partner Onboarding</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Join Gangaram to accept direct orders and save on commissions.
        </p>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 1 ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
        <div className={`w-12 h-1 ${step >= 2 ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 2 ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
        <div className={`w-12 h-1 ${step >= 3 ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 3 ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
      </div>

      <div className="p-6 rounded-2xl shadow-sm border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        
        {step === 1 && (
          <form onSubmit={handleDraftSubmit} className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-semibold mb-1">Restaurant Name</label>
              <input type="text" required value={name} onChange={e => {setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));}} className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Unique Store URL (Slug)</label>
              <input type="text" required value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))} className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">City</label>
              <input type="text" required value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 mt-4 flex justify-center items-center gap-2" style={{ background: "var(--primary)" }}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save & Continue"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleDocsSubmit} className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Business Documents</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Please provide your tax and registration details along with certificates.</p>
            
            <div>
              <label className="block text-sm font-semibold mb-1">FSSAI Number</label>
              <input type="text" value={fssai} onChange={e => setFssai(e.target.value)} placeholder="14-digit FSSAI number" className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">FSSAI Certificate (PDF/JPG/PNG, Max 5MB)</label>
              <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <Upload className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
                <input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const validation = validateCertificateFile(file);
                      if (!validation.valid) {
                        showToast(validation.error!, "error");
                        e.target.value = "";
                        return;
                      }
                      setFssaiFile(file);
                    }
                  }}
                  className="flex-1 text-sm outline-none"
                />
              </div>
              {fssaiFile && (
                <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>Selected: {fssaiFile.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">GST Number</label>
              <input type="text" value={gst} onChange={e => setGst(e.target.value)} placeholder="15-digit GSTIN" className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">GST Certificate (PDF/JPG/PNG, Max 5MB)</label>
              <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <Upload className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
                <input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const validation = validateCertificateFile(file);
                      if (!validation.valid) {
                        showToast(validation.error!, "error");
                        e.target.value = "";
                        return;
                      }
                      setGstFile(file);
                    }
                  }}
                  className="flex-1 text-sm outline-none"
                />
              </div>
              {gstFile && (
                <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>Selected: {gstFile.name}</p>
              )}
            </div>

            <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 mt-4 flex justify-center items-center gap-2" style={{ background: "var(--primary)" }}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application"}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            {status === "PENDING_VERIFICATION" && (
              <>
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--warning)" }} />
                <h2 className="text-xl font-bold mb-2">Application Under Review</h2>
                <p style={{ color: "var(--text-secondary)" }}>We are currently reviewing your documents. We will notify you once approved.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-6 px-6 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
                  style={{ background: "var(--primary)" }}
                >
                  Refresh Status
                </button>
              </>
            )}

            {status === "LIVE" && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--accent)" }} />
                <h2 className="text-xl font-bold mb-2">Approved!</h2>
                <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Your restaurant is live. Please log out and log back in to access the Kitchen Dashboard.</p>
              </>
            )}

            {status === "REJECTED" && (
              <>
                <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--error)" }} />
                <h2 className="text-xl font-bold mb-2">Application Rejected</h2>
                <p style={{ color: "var(--text-secondary)" }}>{rejectionReason || "There was an issue with your application documents."}</p>
                <button onClick={() => setStep(2)} className="mt-6 px-6 py-2 rounded-lg font-bold border" style={{ borderColor: "var(--border)", color: "var(--primary)" }}>
                  Update Documents
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
