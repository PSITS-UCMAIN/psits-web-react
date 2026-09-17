import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Minus, Plus, Trash, Tag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useTransactions } from "@/lib/transactions";
import { useAuth } from "@/features/auth";
import { useMembershipGate } from "@/features/student";
import { toast } from "sonner";
import { makeOrder } from "../api/orders";
import { getEligiblePromos, type PromoOption } from "../api/promo";

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
      return new Set();
    }
    return new Set();
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [eligiblePromos, setEligiblePromos] = useState<PromoOption[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<PromoOption | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuth();
  const { ensureActiveMembership } = useMembershipGate();

  const fetchEligiblePromos = useCallback(async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.uid));
    if (selectedItems.length === 0) {
      setEligiblePromos([]);
      setSelectedPromo(null);
      return;
    }
    setPromoLoading(true);
    try {
      const promos = await getEligiblePromos(selectedItems.map((i) => String(i.id)));
      setEligiblePromos(promos || []);
    } catch {
      setEligiblePromos([]);
    } finally {
      setPromoLoading(false);
    }
  }, [items, selectedIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchEligiblePromos();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchEligiblePromos]);

  const handlePlaceOrder = async () => {
    const selected = items.filter((i) => selectedIds.has(i.uid));
    if (selected.length === 0) return;

    if (!(await ensureActiveMembership())) return;

    const idNumber = user?.idNumber || null;
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
        imageUrl1: s.image,
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
        promo_id: selectedPromo?._id,
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

            {selectedIds.size > 0 && (() => {
              const originalTotal = items
                .filter((i) => selectedIds.has(i.uid))
                .reduce((a, b) => a + b.price * b.qty, 0);
              const discountedTotal = selectedPromo
                ? originalTotal * (1 - selectedPromo.discount / 100)
                : originalTotal;
              return (
              <div className="mb-4">
                {selectedPromo && (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">
                        {selectedPromo.promo_name} ({selectedPromo.discount}% off)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPromo(null)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-bold text-[#1C9DDE]">
                    ₱{originalTotal.toFixed(2)}
                  </span>
                </div>

                {selectedPromo && (
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-green-600">Discount ({selectedPromo.discount}%)</span>
                    <span className="font-medium text-green-600">
                      -₱{(originalTotal * selectedPromo.discount / 100).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="mt-2 border-t pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Amount Due</span>
                  <span className="text-lg font-bold text-[#1C9DDE]">
                    ₱{discountedTotal.toFixed(2)}
                  </span>
                </div>

                <div className="mt-3">
                  {promoLoading ? (
                    <p className="text-xs text-gray-400">Checking promos...</p>
                  ) : eligiblePromos.length === 0 ? (
                    <p className="text-xs text-gray-400">No promo codes available for selected items</p>
                  ) : (
                    <select
                      value={selectedPromo?._id ?? ""}
                      onChange={(e) => {
                        const found = eligiblePromos.find((p) => p._id === e.target.value);
                        setSelectedPromo(found || null);
                      }}
                      className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-xs text-gray-600 focus:border-[#1c9dde] focus:outline-none"
                    >
                      <option value="">Select a promo code</option>
                      {eligiblePromos.map((promo) => (
                        <option key={promo._id} value={promo._id}>
                          {promo.promo_name} ({promo.discount}% off)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              );
            })()}
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
