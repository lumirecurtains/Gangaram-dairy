"use client";

import { ChevronRight } from "lucide-react";

export interface StorefrontBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaLabel?: string | null;
  linkType: string;
  linkTarget?: string | null;
  bannerType: string;
}

interface CustomerBannersProps {
  banners: StorefrontBanner[];
  onBannerClick: (banner: StorefrontBanner) => void;
}

export function CustomerBanners({ banners, onBannerClick }: CustomerBannersProps) {
  if (!banners || banners.length === 0) return null;

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-none snap-x snap-mandatory">
      {banners.map((b) => (
        <div
          key={b.id}
          onClick={() => onBannerClick(b)}
          className="flex-shrink-0 w-[85%] md:w-[350px] h-40 snap-center cursor-pointer rounded-2xl overflow-hidden relative border group"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          role="button"
          tabIndex={0}
        >
          <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
            <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">{b.title}</h3>
            {b.subtitle && <p className="text-white/90 text-sm mt-0.5 drop-shadow-md line-clamp-1">{b.subtitle}</p>}
            {b.ctaLabel && (
              <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-white px-3 py-1 rounded-full w-max shadow-lg" style={{ background: "var(--primary)" }}>
                {b.ctaLabel} <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
