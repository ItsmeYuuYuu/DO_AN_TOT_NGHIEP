import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { cartApi } from '../api/cartApi';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CartItem {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;  // e.g. "128GB - Đen"
  sku: string;
  imageUrl: string;
  price: number;        // sale price
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => Promise<void>;
  removeFromCart: (variantId: number) => Promise<void>;
  updateQuantity: (variantId: number, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (variantId: number) => boolean;
  loading: boolean;
}

const CART_KEY = 'ec_cart';

// ─── Context ──────────────────────────────────────────────────────────────────
const CartContext = createContext<CartContextValue>({
  items: [],
  totalItems: 0,
  totalPrice: 0,
  addToCart: async () => {},
  removeFromCart: async () => {},
  updateQuantity: async () => {},
  clearCart: async () => {},
  isInCart: () => false,
  loading: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const loadFromStorage = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (items: CartItem[]) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync cart from server or local storage when login status changes
  useEffect(() => {
    const syncCart = async () => {
      setLoading(true);
      try {
        const localItems = loadFromStorage();
        if (localItems.length > 0) {
          const mergeItems = localItems.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
          const res = await cartApi.mergeCart(mergeItems);
          setItems(res.data.items);
          localStorage.removeItem(CART_KEY); // Clear local items on successful merge
        } else {
          const res = await cartApi.getCart();
          setItems(res.data.items);
        }
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      syncCart();
    } else {
      setItems(loadFromStorage());
    }
  }, [isLoggedIn]);

  // Persist to local storage only when NOT logged in
  useEffect(() => {
    if (!isLoggedIn) {
      saveToStorage(items);
    }
  }, [items, isLoggedIn]);

  const addToCart = useCallback(async (item: Omit<CartItem, 'quantity'>, qty = 1) => {
    if (isLoggedIn) {
      setLoading(true);
      try {
        const res = await cartApi.addToCart(item.variantId, qty);
        setItems(res.data.items);
      } catch (error) {
        console.error('Failed to add to cart on server:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setItems(prev => {
        const existing = prev.find(i => i.variantId === item.variantId);
        if (existing) {
          return prev.map(i =>
            i.variantId === item.variantId
              ? { ...i, quantity: i.quantity + qty }
              : i
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
    }
  }, [isLoggedIn]);

  const removeFromCart = useCallback(async (variantId: number) => {
    if (isLoggedIn) {
      setLoading(true);
      try {
        const res = await cartApi.removeFromCart(variantId);
        setItems(res.data.items);
      } catch (error) {
        console.error('Failed to remove from cart on server:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setItems(prev => prev.filter(i => i.variantId !== variantId));
    }
  }, [isLoggedIn]);

  const updateQuantity = useCallback(async (variantId: number, qty: number) => {
    if (isLoggedIn) {
      setLoading(true);
      try {
        const res = await cartApi.updateQuantity(variantId, qty);
        setItems(res.data.items);
      } catch (error) {
        console.error('Failed to update cart quantity on server:', error);
      } finally {
        setLoading(false);
      }
    } else {
      if (qty <= 0) {
        setItems(prev => prev.filter(i => i.variantId !== variantId));
      } else {
        setItems(prev =>
          prev.map(i => i.variantId === variantId ? { ...i, quantity: qty } : i)
        );
      }
    }
  }, [isLoggedIn]);

  const clearCart = useCallback(async () => {
    if (isLoggedIn) {
      setLoading(true);
      try {
        await cartApi.clearCart();
        setItems([]);
      } catch (error) {
        console.error('Failed to clear cart on server:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setItems([]);
      localStorage.removeItem(CART_KEY);
    }
  }, [isLoggedIn]);

  const isInCart = useCallback((variantId: number) =>
    items.some(i => i.variantId === variantId), [items]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, totalItems, totalPrice,
      addToCart, removeFromCart, updateQuantity, clearCart, isInCart, loading
    }}>
      {children}
    </CartContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCart = () => useContext(CartContext);
