import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { RazorpayScript } from "@/lib/components/payment/RazorpayScript";

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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999] bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-bold">
          Skip to content
        </a>
        <Providers>
          <RazorpayScript />
          {children}
        </Providers>
      </body>
    </html>
  );
}
