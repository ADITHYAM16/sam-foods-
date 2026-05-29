import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FoodItem } from "./menu-data";

export interface CartItem extends FoodItem {
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: FoodItem) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  delivery: number;
  gst: number;
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "sam_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) {
        const parsed: CartItem[] = JSON.parse(raw);
        // Enforce 100% pure veg: drop any legacy non-veg items
        setItems(parsed.filter((i) => i.veg !== false));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add = (item: FoodItem) => {
    if (item.veg === false) {
      if (typeof window !== "undefined") {
        console.warn("[SAM] Blocked non-veg item from cart:", item.name);
      }
      return;
    }
    setItems((prev) => {
      const f = prev.find((p) => p.id === item.id);
      if (f) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { ...item, qty: 1 }];
    });
  };
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((prev) => (qty <= 0 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, qty } : p))));
  const clear = () => setItems([]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery = items.length ? (subtotal > 499 ? 0 : 39) : 0;
    const gst = Math.round(subtotal * 0.05);
    return {
      items,
      add,
      remove,
      setQty,
      clear,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal,
      delivery,
      gst,
      total: subtotal + delivery + gst,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
