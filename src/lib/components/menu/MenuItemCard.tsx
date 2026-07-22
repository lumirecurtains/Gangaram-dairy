"use client";

import { useCart } from "@/lib/contexts";
import { IndianRupee, Plus, Minus, Leaf } from "lucide-react";

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
}

export function MenuItemCard({
  itemId, name, description, ourPrice, aggregatorPrice,
  imageUrl, veg, merchantId, merchantName, baseCost, hotelProfit
}: MenuItemCardProps) {
  const { items, addItem, removeItem, updateQty } = useCart();
  const cartItem = items.find((i) => i.itemId === itemId);
  const qty = cartItem?.qty || 0;
  const savings = aggregatorPrice ? aggregatorPrice - ourPrice : 0;

  return (
    <div
      className="flex gap-4 p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Image */}
      <div className="w-24 h-24 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: "var(--bg)" }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="w-8 h-8 opacity-20" style={{ color: veg ? "var(--accent)" : "var(--error)" }} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {veg ? (
            <span className="w-4 h-4 rounded-sm border-2 flex items-center justify-center" style={{ borderColor: "var(--accent)" }}>
              <span className="w-2 h-2 rounded-sm" style={{ background: "var(--accent)" }} />
            </span>
          ) : (
            <span className="w-4 h-4 rounded-sm border-2 flex items-center justify-center" style={{ borderColor: "var(--error)" }}>
              <span className="w-2 h-2 rounded-sm" style={{ background: "var(--error)" }} />
            </span>
          )}
          <h4 className="font-semibold truncate">{name}</h4>
        </div>

        <p className="text-sm line-clamp-2 mb-2" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>

        {/* Price */}
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center font-bold text-lg">
            <IndianRupee className="w-4 h-4" />{ourPrice}
          </span>
          {aggregatorPrice && aggregatorPrice > ourPrice && (
            <>
              <span className="flex items-center text-sm line-through" style={{ color: "var(--text-secondary)" }}>
                <IndianRupee className="w-3 h-3" />{aggregatorPrice}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,200,83,0.15)", color: "var(--accent)" }}>
                Save ₹{savings}
              </span>
            </>
          )}
        </div>

        {/* Add to Cart */}
        <div className="flex items-center justify-end">
          {qty === 0 ? (
            <button
              onClick={() => addItem(
                { itemId, name, ourPrice, aggregatorPrice, baseCost, hotelProfit, qty: 1, imageUrl },
                merchantId, merchantName
              )}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: "var(--primary)" }}
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => qty === 1 ? removeItem(itemId) : updateQty(itemId, qty - 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all"
                style={{ background: "var(--primary)" }}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold w-6 text-center">{qty}</span>
              <button
                onClick={() => updateQty(itemId, qty + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all"
                style={{ background: "var(--primary)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
