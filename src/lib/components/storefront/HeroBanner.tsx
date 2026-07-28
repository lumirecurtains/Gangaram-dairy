"use client";

import { Clock, MapPin, IndianRupee, Star } from "lucide-react";

interface HeroBannerProps {
  name: string;
  cuisine: string | null;
  isOnline?: boolean;
  openingHours: string | null;
  priceForTwo: number | null;
  averageRating?: number;
  reviewCount?: number;
  city: string;
  brandColor: string | null;
  promoBanner: string | null;
}

export function HeroBanner({
  name,
  cuisine,
  isOnline,
  openingHours,
  priceForTwo,
  averageRating,
  reviewCount,
  city,
  brandColor,
  promoBanner,
}: HeroBannerProps) {
  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{
        background: brandColor || "var(--primary-light)",
        backgroundImage: promoBanner ? `url(${promoBanner})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay to ensure text readability if a background image is used */}
      {promoBanner && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 heading-tight">
            {name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            {cuisine && <span>{cuisine}</span>}
            {isOnline !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isOnline ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"
              }`}>
                {isOnline ? "Open" : "Closed"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/70">
            {openingHours && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {openingHours}
              </span>
            )}
            {priceForTwo && (
              <span className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" /> {priceForTwo} for two
              </span>
            )}
            {averageRating && averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {averageRating.toFixed(1)} ({reviewCount || 0})
              </span>
            )}
          </div>
        </div>
        {city && (
          <span className="flex items-center gap-1 text-white/60 text-xs">
            <MapPin className="w-3 h-3" /> {city}
          </span>
        )}
      </div>
    </div>
  );
}
