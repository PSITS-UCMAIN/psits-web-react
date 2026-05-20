import React, { createContext, useContext, useEffect, useState } from "react";
import type { CartItem } from "./cart";

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  createdAt: string;
}

interface TransactionsContextValue {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  clearTransactions: () => void;
}

const STORAGE_KEY = "psits_txns_v1";

const TransactionsContext = createContext<TransactionsContextValue | undefined>(
  undefined
);

export function TransactionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      // ignore
    }
  }, [transactions]);

  const addTransaction = (t: Omit<Transaction, "id" | "createdAt">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    setTransactions((s) => [{ id, createdAt, ...t }, ...s]);
  };

  const clearTransactions = () => setTransactions([]);

  return (
    <TransactionsContext.Provider
      value={{ transactions, addTransaction, clearTransactions }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx)
    throw new Error("useTransactions must be used within TransactionsProvider");
  return ctx;
}

export default TransactionsProvider;
