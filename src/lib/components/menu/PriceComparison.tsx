"use client";

import { IndianRupee, TrendingDown } from "lucide-react";

interface PriceComparisonProps {
  ourPrice: number;
  aggregatorPrice?: number | null;
}

export function PriceComparison({ ourPrice, aggregatorPrice }: PriceComparisonProps) {
  if (!aggregatorPrice || aggregatorPrice <= ourPrice) return null;

  const savings = aggregatorPrice - ourPrice;
  const percent = Math.round((savings / aggregatorPrice) * 100);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,200,83,0.1)" }}>
      <TrendingDown className="w-4 h-4" style={{ color: "var(--accent)" }} />
      <span style={{ color: "var(--accent)" }}>
        <span className="font-semibold">{percent}% cheaper</span> than other apps
      </span>
    </div>
  );
}
