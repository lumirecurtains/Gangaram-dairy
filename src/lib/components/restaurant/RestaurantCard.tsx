"use client";

import Link from "next/link";
import { Store, Clock, IndianRupee, Star } from "lucide-react";

interface RestaurantCardProps {
  id: string;
  name: string;
  slug: string;
  city: string;
  cuisine?: string | null;
  openingHours?: string | null;
  priceForTwo?: number | null;
  promoBanner?: string | null;
  brandColor?: string | null;
  isOnline: boolean;
}

export function RestaurantCard({
  id, name, slug, city, cuisine, openingHours, priceForTwo, promoBanner, brandColor, isOnline
}: RestaurantCardProps) {
  return (
    <Link
      href={`/h/${slug}`}
      className="group block rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Banner / Image */}
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden"
        style={{ background: brandColor || "var(--primary-light)" }}
      >
        {promoBanner ? (
          <img src={promoBanner} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <Store className="w-16 h-16 opacity-30" style={{ color: brandColor ? "#fff" : "var(--primary)" }} />
        )}
        {!isOnline && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-900/70 text-white">
            Closed
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-lg group-hover:opacity-80 transition-opacity">{name}</h3>

        {cuisine && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {cuisine}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          {openingHours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {openingHours}
            </span>
          )}
          {priceForTwo && (
            <span className="flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> {priceForTwo} for two
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
