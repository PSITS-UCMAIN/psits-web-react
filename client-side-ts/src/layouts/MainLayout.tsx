import { Outlet } from "react-router";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import CartProvider from "@/lib/cart";
import TransactionsProvider from "@/lib/transactions";
import { Toaster } from "@/components/ui/sonner";

export const MainLayout = () => {
  return (
    <TransactionsProvider>
      <CartProvider>
        <div className="flex min-h-screen flex-col overflow-x-clip bg-gray-50/50">
          <Header />
          <main className="flex-grow">
            <Outlet />
          </main>
          <Footer />
          <Toaster position="top-right" />
        </div>
      </CartProvider>
    </TransactionsProvider>
  );
};
