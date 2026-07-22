"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { KITCHEN_CONFIG } from "../config/constants";

interface MerchantContextType {
  merchantId: string;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export function MerchantProvider({ children }: { children: ReactNode }) {
  const { claims } = useAuth();
  
  // Future-proofing for Module 8 (RBAC): 
  // Read 'merchantId' from the Firebase Auth Custom Claims. 
  // Fallback to the configuration constant for current dev flow.
  const merchantId = (claims?.merchantId as string) || KITCHEN_CONFIG.DEMO_MERCHANT_ID;

  return (
    <MerchantContext.Provider value={{ merchantId }}>
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error("useMerchant must be used within MerchantProvider");
  return ctx;
}
