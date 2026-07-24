const fs = require('fs');
let file = fs.readFileSync('src/app/login/page.tsx', 'utf8');

file = file.replace(/import { useRouter } from "next\/navigation";/, 'import { useRouter, useSearchParams } from "next/navigation";\nimport { Suspense } from "react";');

const logicReplace = `function LoginContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectParam = searchParams.get('redirect');
    if (redirectParam && typeof window !== 'undefined') {
      sessionStorage.setItem('loginRedirect', redirectParam);
    }
  }, [searchParams]);

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>}>
      <LoginContent />
    </Suspense>
  );
}`;

file = file.replace(/export default function LoginPage\(\) \{[\s\S]*\}\n$/, logicReplace);
fs.writeFileSync('src/app/login/page.tsx', file);
