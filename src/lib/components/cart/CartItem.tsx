"use client";

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

export function CartItemRow({ itemId, name, ourPrice, qty, veg, imageUrl }: CartItemProps) {
  const { updateQty, removeItem } = useCart();

  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Image */}
      <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: "var(--bg)" }}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
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
          onClick={() => qty === 1 ? removeItem(itemId) : updateQty(itemId, qty - 1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
          style={{ background: "var(--primary)" }}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-bold w-5 text-center text-sm">{qty}</span>
        <button
          onClick={() => updateQty(itemId, qty + 1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Total */}
      <div className="text-right min-w-[60px]">
        <p className="font-bold text-sm"><IndianRupee className="w-3 h-3 inline" />{ourPrice * qty}</p>
      </div>
    </div>
  );
}
