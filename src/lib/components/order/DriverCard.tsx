"use client";

import { Bike, Phone } from "lucide-react";

interface DriverCardProps {
  name?: string;
  phone?: string;
  vehicle?: string;
}

export function DriverCard({ name = "Assigned Rider", phone, vehicle = "Bike" }: DriverCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
        <Bike className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{name}</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{vehicle}</p>
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="p-3 rounded-xl text-white"
          style={{ background: "var(--accent)" }}
        >
          <Phone className="w-5 h-5" />
        </a>
      )}
    </div>
  );
}
