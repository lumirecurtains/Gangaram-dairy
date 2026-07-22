"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface RiderContextType {
  riderId: string | null;
  isRider: boolean;
}

const RiderContext = createContext<RiderContextType | undefined>(undefined);

export function RiderProvider({ children }: { children: ReactNode }) {
  const { user, claims } = useAuth();
  
  // Future-proofing for Module 8 (RBAC): 
  // Read 'rider' from the Firebase Auth Custom Claims. 
  // We ONLY allow access if the authenticated UID and 'rider' claim are present.
  const isRider = claims?.rider === true;
  const riderId = isRider && user?.uid ? user.uid : null;

  return (
    <RiderContext.Provider value={{ riderId, isRider }}>
      {children}
    </RiderContext.Provider>
  );
}

export function useRider() {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error("useRider must be used within RiderProvider");
  return ctx;
}
