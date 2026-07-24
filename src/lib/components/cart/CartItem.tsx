"use client";

import { memo, useState, useCallback } from "react";
import { useCart } from "@/lib/contexts";
import { Minus, Plus, Trash2, IndianRupee, Leaf } from "lucide-react";

interface CartItemProps {
  itemId: string;
  name: string;
  ourPrice: number;
  qty: number;
  veg?: boolean;
  imageUrl?: string;
}

export const CartItemRow = memo(function CartItemRow({ itemId, name, ourPrice, qty, veg, imageUrl }: CartItemProps) {
  const { updateQty, removeItem } = useCart();
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const handleDecrement = useCallback(() => {
    if (qty === 1) {
      removeItem(itemId);
    } else {
      setAnimatingId("dec");
      updateQty(itemId, qty - 1);
      setTimeout(() => setAnimatingId(null), 300);
    }
  }, [itemId, qty, removeItem, updateQty]);

  const handleIncrement = useCallback(() => {
    setAnimatingId("inc");
    updateQty(itemId, qty + 1);
    setTimeout(() => setAnimatingId(null), 300);
  }, [itemId, qty, updateQty]);

  return (
    <div
      className="flex items-center gap-3 py-3 animate-fade-in"
      style={{ borderBottom: "1px solid var(--border)" }}
      role="listitem"
    >
      {/* Image */}
      <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: "var(--bg)" }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="w-5 h-5 opacity-20" style={{ color: veg ? "var(--accent)" : "var(--error)" }} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{name}</h4>
        <p className="flex items-center text-sm font-semibold mt-0.5">
          <IndianRupee className="w-3.5 h-3.5" />{ourPrice}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrement}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 ${
            animatingId === "dec" ? "animate-scale-bounce" : ""
          }`}
          style={{ background: "var(--primary)" }}
          aria-label={`Remove one ${name}`}
        >
          {qty === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
        </button>
        <span className="font-bold w-5 text-center text-sm tabular-nums animate-count-up" key={`${itemId}-${qty}`}>
          {qty}
        </span>
        <button
          onClick={handleIncrement}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 ${
            animatingId === "inc" ? "animate-scale-bounce" : ""
          }`}
          style={{ background: "var(--primary)" }}
          aria-label={`Add one more ${name}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Total */}
      <div className="text-right min-w-[60px]">
        <p className="font-bold text-sm tabular-nums">
          <IndianRupee className="w-3 h-3 inline" />{ourPrice * qty}
        </p>
      </div>
    </div>
  );
});
