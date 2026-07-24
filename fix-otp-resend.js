const fs = require('fs');
let file = fs.readFileSync('src/lib/components/auth/OTPLogin.tsx', 'utf8');

const effectAdd = `  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();`;

file = file.replace(/  const handleSendOtp = async \(e: React\.FormEvent\) => \{/, effectAdd);

const successAdd = `        showToast("Code sent to your phone", "success");
        setResendCooldown(30);`;
file = file.replace(/        showToast\("Code sent to your phone", "success"\);/, successAdd);

const uiAdd = `        <button
          onClick={() => handleVerifyOtp(otp.join(""))}
          disabled={loading || otp.some(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
        </button>

        <div className="text-center mt-6">
          <button 
            onClick={() => handleSendOtp()} 
            disabled={resendCooldown > 0 || loading}
            className="text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ color: "var(--primary)" }}
            type="button"
          >
            {resendCooldown > 0 ? \`Resend code in \${resendCooldown}s\` : "Resend code"}
          </button>
        </div>`;

file = file.replace(/        <button\n          onClick=\{\(\) => handleVerifyOtp\(otp\.join\(""\)\)\}[\s\S]*?<\/button>/m, uiAdd);

fs.writeFileSync('src/lib/components/auth/OTPLogin.tsx', file);
