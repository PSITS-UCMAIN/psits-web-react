import React from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Minus, Plus, Trash } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useTransactions } from "@/lib/transactions";
import { toast } from "sonner";
import { makeOrder } from "../api/orders";

const TOAST_STYLE = {
  background: "#1DA1F2",
  color: "#ffffff",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
} as const;

const ERROR_TOAST_STYLE = {
  background: "#ef4444",
  color: "#ffffff",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
} as const;

export const Cart: React.FC = () => {
  const { items, removeItem, updateQty } = useCart();
  const { addTransaction } = useTransactions();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => {
    // Check for pre-selected item from Buy Now
    try {
      const preSelected = sessionStorage.getItem("buyNowItemId");
      if (preSelected) {
        sessionStorage.removeItem("buyNowItemId");
        return new Set([preSelected]);
      }
    } catch {
      /* ignored */
    }
    return new Set();
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const navigate = useNavigate();

  const getIdNumber = (): string | null => {
    try {
      const possibleKeys = [
        "id_number",
        "IdNumber",
        "idNumber",
        "student_id",
        "StudentId",
        "user",
      ];
      for (const k of possibleKeys) {
        const v = sessionStorage.getItem(k);
        if (!v) continue;
        if (k === "user" || k === "User" || v.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(v);
            if (
              parsed &&
              (parsed.id_number || parsed.idNumber || parsed.student_id)
            ) {
              return parsed.id_number || parsed.idNumber || parsed.student_id;
            }
          } catch {
            /* ignored */
          }
        }
        return v;
      }
    } catch {
      /* ignored */
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    const selected = items.filter((i) => selectedIds.has(i.uid));
    if (selected.length === 0) return;

    const idNumber = getIdNumber();
    if (!idNumber) {
      toast.error("Please log in to place an order", {
        style: ERROR_TOAST_STYLE,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform cart items to API format
      const orderItems = selected.map((s) => ({
        product_id: String(s.id),
        product_name: s.name,
        price: s.price,
        quantity: s.qty,
        sub_total: s.price * s.qty,
        variation: s.color ? [s.color] : undefined,
        sizes: s.size ? [s.size] : undefined,
      }));

      const total = selected.reduce((a, b) => a + b.price * b.qty, 0);

      const success = await makeOrder({
        id_number: idNumber,
        items: orderItems,
        total,
      });

      if (success) {
        // Save to local transactions as backup/history
        addTransaction({
          items: selected.map((s) => ({ ...s })),
          total,
        });

        // Clear selected items from cart
        selected.forEach((s) => removeItem(s.uid));
        setSelectedIds(new Set());

        toast.success(
          `Order placed for ${selected.length} item(s) successfully!`,
          {
            style: TOAST_STYLE,
          }
        );
      } else {
        toast.error("Failed to place order. Please try again.", {
          style: ERROR_TOAST_STYLE,
        });
      }
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to place order. Please try again.", {
        style: ERROR_TOAST_STYLE,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 text-6xl">🛒</div>
          <h2 className="mb-2 text-2xl font-semibold">Your cart is empty</h2>
          <p className="mb-6 text-sm text-gray-500">
            Looks like you haven't added any items yet. Start shopping to add
            products to your cart.
          </p>
          <div className="flex items-center justify-center">
            <Button
              onClick={() => navigate("/shop")}
              className="cursor-pointer bg-[#1C9DDE] text-white"
            >
              Shop products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-3">
      <div className="mt-10 lg:col-span-2">
        <h1 className="mb-6 text-3xl font-semibold">My Cart</h1>

        <div className="mb-6 flex items-center justify-between">
          <label className="flex items-center gap-3 text-sm text-gray-600">
            <Checkbox
              className="cursor-pointer border-gray-300"
              checked={selectedIds.size === items.length}
              onCheckedChange={(v) => {
                if (v) setSelectedIds(new Set(items.map((i) => i.uid)));
                else setSelectedIds(new Set());
              }}
            />
            <span>Select All</span>
          </label>
          <button
            className="cursor-pointer text-sm text-red-500"
            onClick={() => {
              selectedIds.forEach((id) => removeItem(id));
              setSelectedIds(new Set());
            }}
          >
            Remove
          </button>
        </div>

        <div className="space-y-4">
          {items.map((it) => (
            <Card key={it.uid} className="relative rounded-2xl">
              {/* Mobile-only delete button in top-right corner */}
              <button
                onClick={() => removeItem(it.uid)}
                className="absolute top-2 right-2 rounded-md p-2 text-red-500 sm:hidden"
                aria-label="Remove item"
              >
                <Trash />
              </button>
              <div className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <Checkbox
                      className="cursor-pointer border-gray-300"
                      checked={selectedIds.has(it.uid)}
                      onCheckedChange={(v) => {
                        setSelectedIds((prev) => {
                          const copy = new Set(prev);
                          if (v) copy.add(it.uid);
                          else copy.delete(it.uid);
                          return copy;
                        });
                      }}
                    />
                  </div>

                  <Avatar className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-16 md:h-20 md:w-20">
                    <AvatarImage
                      src={it.image}
                      alt={it.name}
                      className="h-full w-full object-cover"
                    />
                  </Avatar>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-gray-900">
                    {it.name}
                  </h3>
                  <p className="truncate text-sm text-gray-500">
                    {it.color}, {it.size}, {it.course}
                  </p>
                </div>

                <div className="flex w-full flex-row items-center justify-between gap-3 sm:w-auto">
                  <div className="order-1 flex items-center gap-3 sm:order-2">
                    <Button
                      className="cursor-pointer"
                      variant="ghost"
                      size="icon"
                      onClick={() => updateQty(it.uid, it.qty - 1)}
                    >
                      <Minus />
                    </Button>
                    <div className="w-10 text-center text-base font-bold">
                      {it.qty}
                    </div>
                    <Button
                      className="cursor-pointer"
                      variant="ghost"
                      size="icon"
                      onClick={() => updateQty(it.uid, it.qty + 1)}
                    >
                      <Plus />
                    </Button>
                    <button
                      onClick={() => removeItem(it.uid)}
                      className="hidden cursor-pointer text-red-500 sm:inline-flex lg:pr-5"
                    >
                      <Trash />
                    </button>
                  </div>

                  <div className="order-2 font-bold text-[#1C9DDE] sm:order-1">
                    ₱{(it.price * it.qty).toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <aside className="mt-10 w-full lg:w-auto">
        <Card className="rounded-2xl">
          <div className="px-4 py-6">
            <h3 className="mb-4 text-lg font-semibold">Order Summary</h3>
            {selectedIds.size === 0 ? (
              <div className="mb-4 text-sm text-gray-500">
                No items selected.
              </div>
            ) : (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Items</span>
                  <span className="text-sm text-gray-800">
                    {selectedIds.size}
                  </span>
                </div>
              </div>
            )}

            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="font-bold text-[#1C9DDE]">
                ₱
                {items
                  .filter((i) => selectedIds.has(i.uid))
                  .reduce((a, b) => a + b.price * b.qty, 0)
                  .toFixed(2)}
              </span>
            </div>
            <Button
              disabled={selectedIds.size === 0 || isSubmitting}
              className="hover:bg-[#1c9dde]/ w-full cursor-pointer bg-[#1DA1F2] text-white"
              onClick={handlePlaceOrder}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Placing Order...
                </>
              ) : (
                "Order"
              )}
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  );
};

export default Cart;
