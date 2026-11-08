// IEC JKUAT — merch cart, shared by the Merchandise page and the Nav.
// On the old merchandise.html the nav carried a "Bag" button with a count
// badge, so the cart has to live above both. Persisted to localStorage
// under 'iec-cart', exactly like merchandise.js.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem } from '../types/db';

interface CartContextValue {
  cart: CartItem[];
  count: number;
  total: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  add: (item: Omit<CartItem, 'quantity'>) => void;
  remove: (index: number) => void;
  updateQuantity: (index: number, delta: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadCart(): CartItem[] {
  try {
    const v = JSON.parse(localStorage.getItem('iec-cart') || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('iec-cart', JSON.stringify(cart));
    } catch {
      /* private mode — persistence is best-effort */
    }
  }, [cart]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id && i.size === item.size);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const remove = useCallback((index: number) => setCart((prev) => prev.filter((_, i) => i !== index)), []);
  const updateQuantity = useCallback(
    (index: number, delta: number) =>
      setCart((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it))),
    []
  );
  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cart.reduce((c, i) => c + i.quantity, 0),
      total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
      cartOpen,
      setCartOpen,
      add,
      remove,
      updateQuantity,
      clear,
    }),
    [cart, cartOpen, add, remove, updateQuantity, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
