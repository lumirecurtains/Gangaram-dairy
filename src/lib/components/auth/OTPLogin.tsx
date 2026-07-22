"use client";

import { useState, useRef } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { showToast } from "@/lib/components/common/Toast";
import { Phone, ArrowRight, Loader2, CheckCircle } from "lucide-react";

export function OTPLogin({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setupRecaptcha = () => {
    const auth = getFirebaseAuth();
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  };

  const sendOTP = async () => {
    if (phone.length < 10) {
      showToast("Please enter a valid phone number", "error");
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      setupRecaptcha();
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
      setConfirmation(result);
      setStep("otp");
      showToast("OTP sent!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      showToast("Please enter all 6 digits", "error");
      return;
    }
    setLoading(true);
    try {
      await confirmation!.confirm(code);
      showToast("Login successful!", "success");
      onSuccess?.();
    } catch (err: any) {
      showToast(err.message || "Invalid OTP", "error");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div id="recaptcha-container" ref={recaptchaRef} />

      {step === "phone" ? (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <Phone className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold">Welcome to Gangaram</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Enter your phone number to login</p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <span className="text-sm font-medium px-2" style={{ color: "var(--text-secondary)" }}>+91</span>
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: "var(--text)" }}
              onKeyDown={(e) => e.key === "Enter" && sendOTP()}
              autoFocus
            />
          </div>

          <button
            onClick={sendOTP}
            disabled={loading || phone.length < 10}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: "var(--primary)" }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send OTP</span> <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <CheckCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold">Enter OTP</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Sent to +91 {phone}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
                style={{
                  background: "var(--bg)",
                  border: `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
                  color: "var(--text)",
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            onClick={verifyOTP}
            disabled={loading || otp.join("").length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: "var(--primary)" }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
          </button>

          <button
            onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); }}
            className="w-full text-sm font-medium text-center hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            Change phone number
          </button>
        </div>
      )}
    </div>
  );
}
