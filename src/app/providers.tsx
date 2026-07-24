"use client";

import { type ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider, AuthProvider, CartProvider, NotificationProvider } from "@/lib/contexts";
import { GlobalCartDrawer } from "@/lib/components/cart/GlobalCartDrawer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <GlobalCartDrawer />
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontSize: "14px",
                },
              }}
            />
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
