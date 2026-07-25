"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface CartItem {
  itemId: string;
  name: string;
  ourPrice: number;
  aggregatorPrice: number | null;
  baseCost: number;
  hotelProfit: number;
  qty: number;
  imageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  merchantId: string | null;
  merchantName: string | null;
  addItem: (item: CartItem, merchantId: string, merchantName: string) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  replaceCart: (items: CartItem[], merchantId: string, merchantName: string) => void;
  itemCount: number;
  subTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("gangaram_cart");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.expiry > Date.now() && Array.isArray(parsed.items)) {
            setItems(parsed.items);
            setMerchantId(parsed.merchantId || null);
            setMerchantName(parsed.merchantName || null);
          } else {
            localStorage.removeItem("gangaram_cart");
          }
        }
      } catch (e) {
        console.error("Failed to load cart from storage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (items.length > 0) {
          localStorage.setItem("gangaram_cart", JSON.stringify({
            items,
            merchantId,
            merchantName,
            expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
          }));
        } else {
          localStorage.removeItem("gangaram_cart");
        }
      } catch (e) {
        console.error("Failed to save cart to storage", e);
      }
    }
  }, [items, merchantId, merchantName]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const addItem = useCallback(
    (item: CartItem, mId: string, mName: string) => {
      setItems((prev) => {
        // If switching merchants, clear first
        if (merchantId && merchantId !== mId) {
          return [{ ...item, qty: 1 }];
        }
        const existing = prev.find((i) => i.itemId === item.itemId);
        if (existing) {
          return prev.map((i) =>
            i.itemId === item.itemId ? { ...i, qty: i.qty + 1 } : i
          );
        }
        return [...prev, { ...item, qty: 1 }];
      });
      setMerchantId(mId);
      setMerchantName(mName);
    },
    [merchantId]
  );

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.itemId !== itemId);
      if (updated.length === 0) {
        setMerchantId(null);
        setMerchantName(null);
      }
      return updated;
    });
  }, []);

  const updateQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) {
      return removeItem(itemId);
    }
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, qty } : i))
    );
  }, [removeItem]);

  const openCartDrawer = useCallback(() => setCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setCartDrawerOpen(false), []);

  const clearCart = useCallback(() => {
    setItems([]);
    setMerchantId(null);
    setMerchantName(null);
  }, []);

  /**
   * Replaces the entire cart with a new set of items and merchant.
   * Used by the Reorder feature to populate the cart from a past order.
   */
  const replaceCart = useCallback(
    (newItems: CartItem[], mId: string, mName: string) => {
      setItems(newItems.map((item) => ({
        ...item,
        qty: item.qty > 0 ? item.qty : 1,
      })));
      setMerchantId(mId);
      setMerchantName(mName);
    },
    []
  );

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const subTotal = items.reduce((sum, i) => sum + i.ourPrice * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        merchantId,
        merchantName,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        replaceCart,
        cartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        itemCount,
        subTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
