import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { addToCartApi } from "../../student/api/student";
import { getMerchandiseById, type MerchandiseItem } from "../api/orders";

// Fallback image for products without images
import fallbackImage from "../../../assets/awarding/1.jpg";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  isSoldOut: boolean;
  category: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  stock?: number;
}

interface ProductDetailsProps {
  product?: Product;
  onBack?: () => void;
}

// Transform API merchandise to display product
const transformMerchandise = (item: MerchandiseItem): Product => ({
  id: item._id,
  name: item.name || item.product_name || "Unknown Product",
  price: item.price,
  image: item.imageUrl?.[0] || item.imageUrl1 || fallbackImage,
  isSoldOut: (item.stocks ?? item.stock ?? 0) <= 0,
  category: item.category || "Merchandise",
  description: item.description,
  sizes: item.sizes,
  colors: item.colors || item.variation,
  stock: item.stocks ?? item.stock,
});

const ADD_TO_CART_TOAST_STYLE = {
  background: "#1DA1F2",
  color: "#ffffff",
  borderRadius: "0.75rem",
  padding: "0.75rem 1rem",
} as const;

interface AddToCartButtonProps {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  selectedCourse: string;
  quantity: number;
  disabled?: boolean;
}

const BuyNowButton: React.FC<AddToCartButtonProps> = ({
  product,
  selectedColor,
  selectedSize,
  selectedCourse,
  quantity,
  disabled = false,
}) => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleBuyNow = React.useCallback(() => {
    if (disabled) return;

    const uid = addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      color: selectedColor,
      size: selectedSize,
      course: selectedCourse,
      qty: quantity,
    });

    if (uid) {
      sessionStorage.setItem("buyNowItemId", uid);
    }

    navigate("/cart");
  }, [
    addItem,
    product,
    selectedColor,
    selectedSize,
    selectedCourse,
    quantity,
    disabled,
    navigate,
  ]);

  const baseClass =
    "flex-1 py-4 sm:py-7 cursor-pointer rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg transition-all shadow-xl";

  return (
    <Button
      disabled={disabled}
      onClick={handleBuyNow}
      className={cn(
        baseClass,
        disabled
          ? "cursor-not-allowed bg-gray-100 text-gray-400 shadow-none"
          : "bg-[#1c9dde] text-white shadow-blue-100 hover:-translate-y-1 hover:bg-[#1a8acb]/90 active:scale-[0.98]"
      )}
    >
      Buy Now
    </Button>
  );
};

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  product,
  selectedColor,
  selectedSize,
  selectedCourse,
  quantity,
  disabled = false,
}) => {
  const { addItem } = useCart();

  const handleAdd = React.useCallback(() => {
    if (disabled) return;

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      color: selectedColor,
      size: selectedSize,
      course: selectedCourse,
      qty: quantity,
    });

    toast.success("Added to cart", {
      style: ADD_TO_CART_TOAST_STYLE,
    });
    try {
      const token = sessionStorage.getItem("Token");
      if (token) {
        // try to find an id_number in sessionStorage under common keys
        const possibleKeys = [
          "id_number",
          "IdNumber",
          "idNumber",
          "student_id",
          "StudentId",
          "user",
        ];
        let id_number: string | undefined = undefined;
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
                id_number =
                  parsed.id_number || parsed.idNumber || parsed.student_id;
                break;
              }
            } catch {
              /* ignored */
            }
          }
          if (!id_number) id_number = v;
          if (id_number) break;
        }

        const payload: {
          product_id: string;
          sizes?: string;
          variation?: string;
          quantity: number;
          id_number?: string;
        } = {
          product_id: product.id,
          sizes: selectedSize,
          variation: selectedColor,
          quantity,
        };
        if (id_number) payload.id_number = id_number;

        addToCartApi(payload).catch((e) =>
          console.error("addToCartApi failed", e)
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, [
    addItem,
    product,
    selectedColor,
    selectedSize,
    selectedCourse,
    quantity,
    disabled,
  ]);

  const baseClass =
    "flex-1 py-4 sm:py-7 cursor-pointer rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg transition-all";

  return (
    <Button
      disabled={disabled}
      onClick={handleAdd}
      className={cn(
        baseClass,
        disabled
          ? "cursor-not-allowed bg-gray-100 text-gray-400"
          : "border-2 border-gray-200 bg-white text-gray-700 hover:border-[#1c9dde]/60 hover:bg-[#f0f9ff] hover:text-[#1c9dde] hover:shadow-sm active:scale-[0.98]"
      )}
    >
      <svg
        className="mr-2 inline h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {disabled ? "Currently Unavailable" : "Add to Cart"}
    </Button>
  );
};

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onBack: _,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("L");
  const [selectedColor, setSelectedColor] = useState("White");
  const [selectedCourse, setSelectedCourse] = useState("BSIT");
  const [fetchedProduct, setFetchedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateProduct = (location.state as { product?: Product })?.product;

  // Fetch product from API if not provided via props or route state
  useEffect(() => {
    const fetchProduct = async () => {
      // If we already have the product from props or route state, don't fetch
      if (product || stateProduct) return;

      // If we have an ID in the URL, fetch from API
      if (id) {
        setLoading(true);
        setError(null);
        try {
          const merchandise = await getMerchandiseById(id);
          if (merchandise) {
            setFetchedProduct(transformMerchandise(merchandise));
          } else {
            setError("Product not found");
          }
        } catch (err) {
          console.error("Error fetching product:", err);
          setError("Failed to load product");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProduct();
  }, [id, product, stateProduct]);

  // Determine which product to display
  const currentProduct = product ?? stateProduct ?? fetchedProduct;

  // Initialize size and color from product data
  useEffect(() => {
    if (currentProduct) {
      if (currentProduct.sizes && currentProduct.sizes.length > 0) {
        setSelectedSize(currentProduct.sizes[0]);
      }
      if (currentProduct.colors && currentProduct.colors.length > 0) {
        setSelectedColor(currentProduct.colors[0]);
      }
    }
  }, [currentProduct]);

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto mt-20 max-w-4xl p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/shop")}
          className="mb-4 text-[#1c9dde]"
        >
          ← Back to shop
        </Button>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1c9dde] border-r-transparent"></div>
          <p className="ml-4 text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto mt-20 max-w-4xl p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/shop")}
          className="mb-4 text-[#1c9dde]"
        >
          ← Back to shop
        </Button>
        <div className="py-12 text-center text-red-500">
          <p>{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#1c9dde] text-white hover:bg-[#1a8acb]"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="mx-auto mt-20 max-w-4xl p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/shop")}
          className="mb-4 text-[#1c9dde]"
        >
          ← Back to shop
        </Button>
        <div className="py-12 text-center text-gray-500">
          Product not found.
        </div>
      </div>
    );
  }

  // Get available sizes and colors from the product, or use defaults
  const availableSizes =
    currentProduct.sizes && currentProduct.sizes.length > 0
      ? currentProduct.sizes
      : ["S", "M", "L", "XL", "XXL"];
  const availableColors =
    currentProduct.colors && currentProduct.colors.length > 0
      ? currentProduct.colors
      : ["White", "Purple"];
  const stockCount = currentProduct.stock ?? 0;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 mx-auto mt-16 min-h-screen max-w-6xl bg-transparent p-4 font-sans duration-500 sm:mt-20 sm:p-6 lg:p-12">
      {/* Breadcrumbs / Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/shop")}
          className="cursor-pointer text-gray-400 hover:text-[#1c9dde]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="ml-2 font-medium">Shop</span>
        </Button>
        <span className="mx-2 text-gray-400">•</span>
        <span className="text-gray-600">Product Details</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 sm:gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: Product Image */}
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[#f3f0e9] shadow-sm sm:rounded-[2.5rem]">
          <img
            src={currentProduct.image}
            alt={currentProduct.name}
            className={cn(
              "h-full w-full object-contain transition-transform duration-700 hover:scale-105",
              currentProduct.isSoldOut && "grayscale"
            )}
          />
        </div>

        {/* Right: Product Details */}
        <div className="flex h-full flex-col">
          <div className="mb-4 sm:mb-8">
            <h1 className="mb-2 text-2xl font-extrabold text-gray-900 sm:mb-4 sm:text-4xl lg:text-5xl">
              {currentProduct.name}
            </h1>
            <p className="text-xl font-bold text-[#1c9dde] sm:text-2xl">
              ₱ {currentProduct.price.toFixed(2)}
            </p>
          </div>

          <div className="space-y-6 sm:space-y-10">
            {/* Color Selection */}
            <div>
              <h3 className="mb-4 text-sm font-bold tracking-wider text-gray-900 uppercase">
                Color
              </h3>
              <div className="flex flex-wrap gap-3">
                {availableColors.map((color) => (
                  <Button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "rounded-full px-5 py-2 text-xs font-bold transition-all sm:px-6 sm:py-3 sm:text-sm",
                      selectedColor === color
                        ? "bg-[#1c9dde] text-white shadow-lg shadow-blue-200"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-[#1c9dde]/90 hover:text-white"
                    )}
                    aria-label={`Select ${color}`}
                  >
                    {color}
                  </Button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase">
                  Size
                </h3>
                <button className="flex items-center gap-1 text-xs font-bold text-[#1c9dde]">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11 5L6 9v4l5 4V5z" />
                  </svg>
                  SIZE GUIDE
                </button>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {availableSizes.map((size) => (
                  <Button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "cursor-pointer rounded-full px-5 py-3 text-xs font-bold transition-all sm:px-8 sm:py-5 sm:text-sm",
                      selectedSize === size
                        ? "bg-[#1c9dde] text-white shadow-lg shadow-blue-200"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-[#1c9dde]/90 hover:text-white"
                    )}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Course Selection */}
            <div>
              <h3 className="mb-4 text-sm font-bold tracking-wider text-gray-900 uppercase">
                Course
              </h3>
              <div className="flex gap-2 sm:gap-3">
                {["BSCS", "BSIT"].map((course) => (
                  <Button
                    key={course}
                    onClick={() => setSelectedCourse(course)}
                    className={cn(
                      "cursor-pointer rounded-full px-5 py-3 text-xs font-bold transition-all sm:px-8 sm:py-5 sm:text-sm",
                      selectedCourse === course
                        ? "bg-[#1c9dde] text-white shadow-lg shadow-blue-200"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-[#1c9dde]/90 hover:text-white"
                    )}
                  >
                    {course}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quantity and Stock */}
            <div>
              <h3 className="mb-3 text-sm font-bold tracking-wider text-gray-900 uppercase sm:mb-4">
                Quantity
              </h3>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div className="flex items-center space-x-4 rounded-full border-2 border-gray-100 px-4 py-1 sm:space-x-8 sm:px-6 sm:py-2">
                  <Button
                    variant="ghost"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-auto cursor-pointer p-0 text-xl font-light text-gray-400 hover:text-gray-900 sm:text-2xl"
                  >
                    −
                  </Button>
                  <span className="min-w-[1.5rem] text-center text-sm font-bold sm:text-base">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setQuantity(Math.min(stockCount, quantity + 1))
                    }
                    className="h-auto cursor-pointer p-0 text-xl font-light text-gray-400 hover:text-gray-900 sm:text-2xl"
                    disabled={quantity >= stockCount}
                  >
                    +
                  </Button>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium sm:text-sm",
                    stockCount > 0 ? "text-gray-400" : "text-red-500"
                  )}
                >
                  {stockCount > 0
                    ? `${stockCount} Stocks Available`
                    : "Out of Stock"}
                </span>
              </div>
            </div>

            {/* Final Action */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <BuyNowButton
                product={currentProduct}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                selectedCourse={selectedCourse}
                quantity={quantity}
                disabled={currentProduct.isSoldOut}
              />
              <AddToCartButton
                product={currentProduct}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                selectedCourse={selectedCourse}
                quantity={quantity}
                disabled={currentProduct.isSoldOut}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
