"use client";

import { useState } from "react";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { AddressForm } from "./AddressForm";

interface AddressSelectorProps {
  defaultAddress: { flat: string; street: string; city: string; pincode: string; landmark: string };
  onChange: (address: { flat: string; street: string; city: string; pincode: string; landmark: string }) => void;
}

export function AddressSelector({ defaultAddress, onChange }: AddressSelectorProps) {
  const isComplete = Boolean(defaultAddress.flat && defaultAddress.street && defaultAddress.city && defaultAddress.pincode);
  const [editing, setEditing] = useState(!isComplete);

  if (!editing) {
    const addrStr = [defaultAddress.flat, defaultAddress.street, defaultAddress.city, defaultAddress.pincode]
      .filter(Boolean).join(", ");

    return (
      <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Delivering to</p>
          <p className="text-sm mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{addrStr}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-sm font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
          style={{ color: "var(--primary)", background: "var(--primary-light)" }}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <AddressForm
        initial={defaultAddress}
        onSave={async (addr) => {
          onChange(addr);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        title="Edit Delivery Address"
      />
    </div>
  );
}
