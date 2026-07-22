
if (typeof window !== 'undefined') { window.addEventListener('error', (e) => { if (e.message?.includes('recaptcha') || e.filename?.includes('recaptcha')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); }
import type { Metadata } from "next";

if (typeof window !== 'undefined') { window.addEventListener('error', (e) => { if (e.message?.includes('recaptcha') || e.filename?.includes('recaptcha')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); }
import { Inter } from "next/font/google";

if (typeof window !== 'undefined') { window.addEventListener('error', (e) => { if (e.message?.includes('recaptcha') || e.filename?.includes('recaptcha')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); }
import "./globals.css";

if (typeof window !== 'undefined') { window.addEventListener('error', (e) => { if (e.message?.includes('recaptcha') || e.filename?.includes('recaptcha')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); }
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gangaram - Order Direct, Save on Fees",
  description:
    "Order food directly from your favourite restaurants. Better prices, no middleman fees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

