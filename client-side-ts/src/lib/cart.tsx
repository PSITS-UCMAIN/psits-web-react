import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface CartItem {
  uid: string; 
  id: string | number; 
  name: string;
  price: number; 
  image: string;
  color?: string;
  size?: string;
  course?: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'uid'>) => string | undefined;
  removeItem: (uid: string) => void;
  updateQty: (uid: string, qty: number) => void;
  clear: () => void;
  total: number;
}

const STORAGE_KEY = 'psits_cart_v1';
const MAX_QTY = 999;
const MAX_NAME_LEN = 512;
const MAX_IMAGE_LEN = 1024;
const MAX_ATTR_LEN = 64; 

const CartContext = createContext<CartContextValue | undefined>(undefined);


function generateUid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* ignored */ }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeStoredItem(obj: unknown): CartItem | null {
  if (!obj || typeof obj !== 'object') return null;
  
  // Support both string IDs (MongoDB) and number IDs (legacy)
  const rawId = obj.id;
  let id: string | number;
  if (typeof rawId === 'string' && rawId.length > 0) {
    id = rawId;
  } else {
    const numId = Number(rawId);
    if (!Number.isFinite(numId) || numId <= 0) return null;
    id = numId;
  }
  
  const name = typeof obj.name === 'string' ? obj.name : '';
  const price = Number(obj.price);

  let qty = Number(obj.qty) || 0;

  if (!Number.isFinite(price) || price < 0) return null;
  qty = Math.max(1, Math.min(MAX_QTY, Math.floor(qty)));

  const uid = typeof obj.uid === 'string' && obj.uid.length > 0 ? obj.uid : generateUid();

  return {
    uid,
    id,
    name: name.slice(0, MAX_NAME_LEN),
    price,
    image: typeof obj.image === 'string' ? obj.image.slice(0, MAX_IMAGE_LEN) : '',
    color: typeof obj.color === 'string' ? obj.color.slice(0, MAX_ATTR_LEN) : undefined,
    size: typeof obj.size === 'string' ? obj.size.slice(0, MAX_ATTR_LEN) : undefined,
    course: typeof obj.course === 'string' ? obj.course.slice(0, MAX_ATTR_LEN) : undefined,
    qty,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const sanitized: CartItem[] = parsed
        .map(sanitizeStoredItem)
        .filter((i): i is CartItem => i !== null);
      return sanitized;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignored */ }
  }, [items]);

  const indexMapRef = React.useRef<Map<string, number>>(new Map());

  const makeKey = (it: { id: string | number; size?: string; color?: string; course?: string }) =>
    `${it.id}|${it.size ?? ''}|${it.color ?? ''}|${it.course ?? ''}`;

  const rebuildIndexMap = (arr: CartItem[]) => {
    const m = new Map<string, number>();
    for (let i = 0; i < arr.length; i++) {
      m.set(makeKey(arr[i]), i);
    }
    indexMapRef.current = m;
  };

  useEffect(() => {
    rebuildIndexMap(items);
  }, []);

  const addItem = (item: Omit<CartItem, 'uid'>): string | undefined => {
    const safeItem = sanitizeStoredItem({ ...item, uid: generateUid() });
    if (!safeItem) return undefined;

    setItems((current) => {
      const key = makeKey(safeItem);
      const idx = indexMapRef.current.get(key) ?? -1;
      if (idx > -1 && idx < current.length) {
        const copy = [...current];
        const existing = copy[idx];
        const newQty = Math.min(MAX_QTY, existing.qty + safeItem.qty);
        copy[idx] = { ...existing, qty: newQty };
        indexMapRef.current.set(key, idx);
        return copy;
      }
      const newArr = [...current, safeItem];
      indexMapRef.current.set(key, newArr.length - 1);
      return newArr;
    });
    return safeItem.uid;
  };

  const removeItem = (uid: string) => {
    setItems((s) => {
      const idx = s.findIndex((i) => i.uid === uid);
      if (idx === -1) return s;
      const newArr = [...s.slice(0, idx), ...s.slice(idx + 1)];
      rebuildIndexMap(newArr);
      return newArr;
    });
  };

  const updateQty = (uid: string, qty: number) => {
    const safeQty = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(qty) || 0)));
    setItems((s) => {
      const idx = s.findIndex((i) => i.uid === uid);
      if (idx === -1) return s;
      const copy = [...s];
      copy[idx] = { ...copy[idx], qty: safeQty };
      return copy;
    });
  };

  const clear = () => {
    setItems([]);
    indexMapRef.current.clear();
  };

  const total = useMemo(() => items.reduce((sum, it) => sum + it.price * it.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export default CartProvider;
