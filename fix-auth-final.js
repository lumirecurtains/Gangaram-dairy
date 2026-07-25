const fs = require('fs');

let file = fs.readFileSync('src/lib/components/auth/OTPLogin.tsx', 'utf8');

file = file.replace(/const sendOTP = async \(\) => \{/, `
  import { useEffect } from "react"; // To make sure it's available

  // Add useEffect inside the component (we'll just use a small hack to ensure no duplicate imports)
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const sendOTP = async () => {`);

// Also need to add useEffect to the imports if it's missing, but it's already there from React:
// import { useState, useRef } from "react";
file = file.replace(/import \{ useState, useRef \} from "react";/, 'import { useState, useRef, useEffect } from "react";');

// In sendOTP success:
file = file.replace(/showToast\("OTP sent!", "success"\);/, 'showToast("OTP sent!", "success");\n      setResendCooldown(30);');

// The resend UI
const uiAdd = `        <button
          onClick={verifyOTP}
          disabled={loading || otp.join("").length !== 6}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          style={{ background: "var(--primary)" }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
        </button>

        <div className="text-center mt-6">
          <button 
            onClick={() => sendOTP()} 
            disabled={resendCooldown > 0 || loading}
            className="text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ color: "var(--primary)" }}
            type="button"
          >
            {resendCooldown > 0 ? \`Resend code in \${resendCooldown}s\` : "Resend code"}
          </button>
        </div>`;

file = file.replace(/        <button\n          onClick=\{verifyOTP\}[\s\S]*?<\/button>/m, uiAdd);

fs.writeFileSync('src/lib/components/auth/OTPLogin.tsx', file);
