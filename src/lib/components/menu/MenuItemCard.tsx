"use client";

import { memo, useState, useCallback } from "react";
import { useCart } from "@/lib/contexts";
import { IndianRupee, Plus, Minus, Leaf, Clock } from "lucide-react";

interface MenuItemCardProps {
  itemId: string;
  name: string;
  description: string;
  ourPrice: number;
  aggregatorPrice: number | null;
  category: string;
  imageUrl: string;
  veg: boolean;
  merchantId: string;
  merchantName: string;
  baseCost: number;
  hotelProfit: number;
  isAvailable?: boolean;
}

export const MenuItemCard = memo(function MenuItemCard({
  itemId, name, description, ourPrice, aggregatorPrice,
  imageUrl, veg, merchantId, merchantName, baseCost, hotelProfit,
  isAvailable = true,
}: MenuItemCardProps) {
  const { items, addItem, removeItem, updateQty } = useCart();
  const cartItem = items.find((i) => i.itemId === itemId);
  const qty = cartItem?.qty || 0;
  const savings = aggregatorPrice ? aggregatorPrice - ourPrice : 0;
  const [animating, setAnimating] = useState(false);

  const handleAdd = useCallback(() => {
    setAnimating(true);
    addItem(
      { itemId, name, ourPrice, aggregatorPrice, baseCost, hotelProfit, qty: 1, imageUrl },
      merchantId, merchantName
    );
    setTimeout(() => setAnimating(false), 350);
  }, [itemId, name, ourPrice, aggregatorPrice, baseCost, hotelProfit, imageUrl, merchantId, merchantName, addItem]);

  return (
    <div
      className={`flex gap-4 p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden ${
        !isAvailable ? "opacity-70" : ""
      }`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      role="article"
      aria-label={`${name}, ₹${ourPrice}${!isAvailable ? ", currently unavailable" : ""}`}
    >
      {/* Sold-out overlay */}
      {!isAvailable && (
        <div className="absolute inset-0 z-10 sold-out-stripes rounded-xl pointer-events-none" />
      )}

      {/* Image */}
      <div className="w-24 h-24 rounded-xl flex-shrink-0 overflow-hidden relative" style={{ background: "var(--bg)" }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="w-8 h-8 opacity-20" style={{ color: veg ? "var(--accent)" : "var(--error)" }} />
          </div>
        )}
        {/* Sold Out badge */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-black/60 backdrop-blur-sm">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Veg/Non-Veg badge */}
          <span
            className="w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0"
            style={{ borderColor: veg ? "var(--accent)" : "var(--error)" }}
            aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
          >
            <span className="w-2 h-2 rounded-sm" style={{ background: veg ? "var(--accent)" : "var(--error)" }} />
          </span>
          <h4 className="font-semibold truncate">{name}</h4>
        </div>

        <p className="text-sm line-clamp-2 mb-2" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>

        {/* Price row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="flex items-center font-bold text-lg" aria-label={`₹${ourPrice}`}>
            <IndianRupee className="w-4 h-4" />{ourPrice}
          </span>
          {aggregatorPrice && aggregatorPrice > ourPrice && (
            <>
              <span className="flex items-center text-sm line-through" style={{ color: "var(--text-secondary)" }} aria-hidden>
                <IndianRupee className="w-3 h-3" />{aggregatorPrice}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full animate-fade-in"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                Save ₹{savings}
              </span>
            </>
          )}
        </div>

        {/* Add to Cart — disabled when sold out */}
        <div className="flex items-center justify-end">
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={!isAvailable}
              className={`px-5 py-3 rounded-lg text-sm font-semibold text-white transition-all ${
                animating ? "animate-scale-bounce" : "hover:scale-105"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              style={{ background: "var(--primary)" }}
              aria-label={`Add ${name} to cart`}
            >
              {!isAvailable ? "Unavailable" : "Add"}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => qty === 1 ? removeItem(itemId) : updateQty(itemId, qty - 1)}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
                style={{ background: "var(--primary)" }}
                aria-label={`Decrease quantity of ${name}`}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold w-6 text-center tabular-nums animate-count-up" key={qty}>
                {qty}
              </span>
              <button
                onClick={() => updateQty(itemId, qty + 1)}
                disabled={!isAvailable}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
                style={{ background: "var(--primary)" }}
                aria-label={`Increase quantity of ${name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
