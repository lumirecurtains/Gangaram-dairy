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
  matchingDishes?: string[];
  averageRating?: number | null;
  reviewCount?: number | null;
}

export function RestaurantCard({
  id, name, slug, city, cuisine, openingHours, priceForTwo, promoBanner, brandColor, isOnline,
  matchingDishes, averageRating, reviewCount,
}: RestaurantCardProps) {
  const hasRating = averageRating && averageRating > 0;

  return (
    <Link
      href={`/h/${slug}`}
      className="group block rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99]"
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
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
            Closed
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-lg group-hover:opacity-80 transition-opacity">{name}</h3>
          {hasRating && (
            <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 ml-2" style={{ color: "var(--text-secondary)" }}>
              <Star className="w-3.5 h-3.5" style={{ fill: "var(--warning)", color: "var(--warning)" }} />
              {averageRating!.toFixed(1)}
            </span>
          )}
        </div>

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
          {hasRating && reviewCount && reviewCount > 0 && (
            <span>({reviewCount})</span>
          )}
        </div>
        
        {matchingDishes && matchingDishes.length > 0 && (
          <div className="pt-2 border-t mt-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
              Matches: {matchingDishes.slice(0, 2).join(", ")}{matchingDishes.length > 2 ? ` +${matchingDishes.length - 2}` : ""}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}