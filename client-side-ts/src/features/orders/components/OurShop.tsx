import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  type ChangeEvent,
} from "react";
import { Link } from "react-router";
import { InfinitySpin } from "react-loader-spinner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { getPublishedMerchandise, type MerchandiseItem } from "../api/orders";

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

// Transform API merchandise to display product
const transformMerchandise = (item: MerchandiseItem): Product => {
  // Backend uses 'name' field, but we also check 'product_name' for compatibility
  const productName = item.name || item.product_name || "Unknown Product";

  // Backend uses imageUrl array, get first image
  const productImage = item.imageUrl?.[0] || item.imageUrl1 || fallbackImage;

  // Get sizes from selectedSizes map or sizes array
  const sizes =
    item.sizes ||
    (item.selectedSizes ? Object.keys(item.selectedSizes) : undefined);

  // Get variations/colors
  const colors = item.colors || item.selectedVariations || item.variation;

  return {
    id: item._id,
    name: productName,
    price: item.price,
    image: productImage,
    isSoldOut: (item.stocks ?? item.stock ?? 0) <= 0,
    category: item.category || "Merchandise",
    description: item.description,
    sizes,
    colors,
    stock: item.stocks ?? item.stock,
  };
};

const PRODUCTS_PER_PAGE = 8;

export const OurShop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>(search);
  const [page, setPage] = useState<number>(1);

  // Fetch products from API on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const merchandise = await getPublishedMerchandise();
        if (merchandise && merchandise.length > 0) {
          const transformed = merchandise.map(transformMerchandise);
          setProducts(transformed);
        } else {
          // No products available from API
          setProducts([]);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products. Please try again later.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const pageCount = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  const paginatedItems = filtered.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE
  );

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-visible bg-gray-50/30">
      <div className="pointer-events-none sticky top-[7vh] left-0 z-0 flex hidden w-full justify-center md:flex">
        <span className="text-[8vw] font-black tracking-tighter text-gray-200 uppercase opacity-40 select-none md:text-[10vw]">
          Merchandise
        </span>
      </div>
      <div className="relative z-10 mx-auto -mt-[10vh] max-w-7xl px-6 pb-20 md:px-16">
        {/* Title Section */}
        <header className="pt- pb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-800 md:text-5xl">
            Our Shop
          </h2>
        </header>

        {/* Search Bar Container */}
        <div className="mb-12 flex justify-center md:justify-end">
          <div className="relative w-full max-w-xs pt-25 sm:pt-20 md:pt-0">
            <InputGroup className="rounded-full">
              <InputGroupInput
                type="text"
                placeholder="Search products..."
                aria-label="Search products"
                value={search}
                onChange={handleSearch}
                className="rounded-full pr-10 pl-5"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Search"
                  variant="ghost"
                  size="xs"
                  className="p-2"
                >
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <InfinitySpin width="200" color="#1c9dde" />
              <p className="mt-4 text-gray-500">Loading products...</p>
            </div>
          ) : error ? (
            <div className="col-span-full py-20 text-center text-red-500">
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-[#1c9dde] px-4 py-2 text-white hover:bg-[#1a8acb]"
              >
                Retry
              </button>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400 italic">
              No products found.
            </div>
          ) : (
            paginatedItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>

        {/* Pagination Section */}
        {pageCount > 1 && (
          <footer className="mt-20 flex justify-center gap-3 border-t border-gray-100 pt-10">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  setPage(i + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  buttonVariants({
                    variant: page === i + 1 ? "outline" : "ghost",
                    size: "icon",
                  }),
                  page === i + 1
                    ? "border-transparent bg-[#1c9dde] text-white hover:bg-[#1a8acb] hover:text-white"
                    : "",
                  "h-12 w-12 cursor-pointer rounded-2xl text-sm font-bold shadow-sm transition-all"
                )}
              >
                {i + 1}
              </button>
            ))}
          </footer>
        )}
      </div>
    </section>
  );
};

const ProductCardInner: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <Link
      to={`/shop/${product.id}`}
      state={{ product }}
      className={`${product.isSoldOut ? "pointer-events-none" : ""}`}
      aria-disabled={product.isSoldOut}
    >
      <div
        className={`group rounded-3xl border border-gray-100 bg-white pb-4 shadow-sm transition-all duration-300 ${product.isSoldOut ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:-translate-y-2 hover:shadow-xl"} `}
      >
        <div className="relative mb-6 aspect-square overflow-hidden rounded-t-2xl">
          {product.isSoldOut && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
              <Badge
                variant="destructive"
                className="tracking-tighter uppercase"
              >
                Sold Out
              </Badge>
            </div>
          )}
          <OptimizedImage
            src={product.image}
            alt={product.name}
            containerClassName="absolute inset-0 h-full w-full"
            className={`object-cover transition-transform duration-500 ${!product.isSoldOut && "group-hover:scale-110"}`}
          />
        </div>

        <div className="space-y-2 px-5">
          <p className="text-[10px] font-bold tracking-widest text-[#1c9dde] uppercase">
            <Badge className="border-0 bg-transparent p-0 text-[#1c9dde]">
              {product.category}
            </Badge>
          </p>
          <p className="truncate text-sm font-semibold text-gray-800 md:text-base">
            {product.name}
          </p>
          <p className="text-xs text-gray-500">
            {product.isSoldOut ? "Currently unavailable" : "In stock"}
          </p>
        </div>
        <div className="flex items-end justify-end px-5">
          <p className="text-base font-black text-[#1c9dde] md:text-lg lg:text-xl">
            ₱{product.price.toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  );
};

const ProductCard = memo(ProductCardInner);

export default OurShop;
