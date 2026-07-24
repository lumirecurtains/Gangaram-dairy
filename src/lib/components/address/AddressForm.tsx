"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface AddressFormProps {
  initial?: { flat: string; street: string; city: string; pincode: string; landmark: string };
  onSave: (address: { flat: string; street: string; city: string; pincode: string; landmark: string }) => void | Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  title?: string;
}

const REQUIRED_FIELDS = ["flat", "street", "city", "pincode"] as const;
const FIELD_LABELS: Record<string, string> = {
  flat: "Flat / House / Apt",
  street: "Street / Area",
  city: "City",
  pincode: "Pincode",
  landmark: "Landmark",
};

export function AddressForm({ initial, onSave, onCancel, saving, title }: AddressFormProps) {
  const [address, setAddress] = useState({
    flat: initial?.flat || "",
    street: initial?.street || "",
    city: initial?.city || "",
    pincode: initial?.pincode || "",
    landmark: initial?.landmark || "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleSubmit = async () => {
    // Touch all fields
    setTouched({ flat: true, street: true, city: true, pincode: true, landmark: true });
    const empty = REQUIRED_FIELDS.filter((f) => !address[f]?.trim());
    if (empty.length > 0) return;
    await onSave(address);
  };

  const getStyle = (field: string) => ({
    background: "var(--bg)",
    color: "var(--text)",
    border: `1px solid ${touched[field] && !address[field]?.trim() ? "var(--error)" : "var(--border)"}`,
    transition: "border 200ms ease",
  });

  return (
    <div className="space-y-3">
      {title && <h3 className="font-bold text-sm">{title}</h3>}
      <div>
        <input placeholder={`${FIELD_LABELS.flat} *`} value={address.flat}
          onChange={(e) => setAddress((p) => ({ ...p, flat: e.target.value }))}
          onBlur={() => setTouched((p) => ({ ...p, flat: true }))}
          className="w-full p-3 rounded-xl text-sm outline-none"
          style={getStyle("flat")}
          aria-invalid={touched.flat && !address.flat?.trim()} />
        {touched.flat && !address.flat?.trim() && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{FIELD_LABELS.flat} is required</p>}
      </div>
      <div>
        <input placeholder={`${FIELD_LABELS.street} *`} value={address.street}
          onChange={(e) => setAddress((p) => ({ ...p, street: e.target.value }))}
          onBlur={() => setTouched((p) => ({ ...p, street: true }))}
          className="w-full p-3 rounded-xl text-sm outline-none"
          style={getStyle("street")}
          aria-invalid={touched.street && !address.street?.trim()} />
        {touched.street && !address.street?.trim() && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{FIELD_LABELS.street} is required</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input placeholder={`${FIELD_LABELS.city} *`} value={address.city}
            onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
            onBlur={() => setTouched((p) => ({ ...p, city: true }))}
            className="w-full p-3 rounded-xl text-sm outline-none"
            style={getStyle("city")}
            aria-invalid={touched.city && !address.city?.trim()} />
          {touched.city && !address.city?.trim() && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{FIELD_LABELS.city} is required</p>}
        </div>
        <div>
          <input placeholder={`${FIELD_LABELS.pincode} *`} value={address.pincode}
            onChange={(e) => setAddress((p) => ({ ...p, pincode: e.target.value }))}
            onBlur={() => setTouched((p) => ({ ...p, pincode: true }))}
            className="w-full p-3 rounded-xl text-sm outline-none"
            style={getStyle("pincode")}
            aria-invalid={touched.pincode && !address.pincode?.trim()} />
          {touched.pincode && !address.pincode?.trim() && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{FIELD_LABELS.pincode} is required</p>}
        </div>
      </div>
      <div>
        <input placeholder="Landmark (optional)" value={address.landmark}
          onChange={(e) => setAddress((p) => ({ ...p, landmark: e.target.value }))}
          className="w-full p-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
      </div>
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button onClick={onCancel} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
        )}
        <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: "var(--primary)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Address"}
        </button>
      </div>
    </div>
  );
}

