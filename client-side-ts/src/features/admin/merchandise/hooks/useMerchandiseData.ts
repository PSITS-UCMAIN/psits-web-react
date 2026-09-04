import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMerchandise,
  deleteMerchandise,
  fetchStudentName,
  merchandiseAdmin,
  publishMerchandise,
  updateMerchandise,
  type MerchandiseItem,
} from "@/features/admin/api/admin";
import { PSITS_ROLES } from "@/features/admin/constants/adminAccess";
import { useAuth } from "@/features/auth";
import { normalizeCampus } from "@/features/auth/utils/campus";
import { showToast } from "@/utils/alertHelper";
import { isProductExpired } from "@/utils/date-manila";
export {
  type ProductVariation,
  PRODUCT_VARIATION_OPTIONS,
  PRODUCT_VARIATIONS,
  getVariationsForCategory,
  getVariationSwatch,
  getVariationLabel,
  getAutoSelectedVariations,
} from "@/features/merchandise/constants/variations";
import type {
  MerchandiseSection,
  MerchandiseSort,
  ProductFilters,
  ProductFormValues,
  ProductImageState,
  ProductSortField,
  ProductStatus,
} from "../types/merchandise.types";

const ROWS_PER_PAGE = 8;

export const PRODUCT_CATEGORIES = [
  { value: "uniform", label: "Uniform" },
  { value: "intramurals", label: "Intramurals" },
  { value: "ict-congress", label: "ICT Congress" },
  { value: "merchandise", label: "Merchandise" },
  { value: "acquintance", label: "Acquaintance" },
] as const;

export const PRODUCT_TYPES: Record<
  string,
  Array<{ value: string; label: string }>
> = {
  uniform: [{ value: "Uniform", label: "Uniform" }],
  intramurals: [
    { value: "Tshirt", label: "T-shirt" },
    { value: "Ticket", label: "Ticket" },
    { value: "Others", label: "Others" },
  ],
  "ict-congress": [{ value: "Tshirt w/ Bundle", label: "T-shirt w/ Bundle" }],
  merchandise: [
    { value: "Tshirt", label: "T-shirt" },
    { value: "Item", label: "Item" },
  ],
  acquintance: [
    { value: "Ticket w/ Bundle", label: "Ticket w/ Bundle" },
    { value: "Others", label: "Others" },
  ],
};

export const PRODUCT_SIZES = [
  "18",
  "2XS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
];

export const PRODUCT_AUDIENCES = [
  { value: "all", label: "All" },
  { value: "officers", label: "Officers" },
  {
    value: "volunteer,media,developer",
    label: "Volunteers, Media and Developers",
  },
];

export const PURCHASE_CONTROLS = [
  { value: "limited-purchase", label: "Limited Purchase" },
  { value: "bulk-purchase", label: "Bulk Purchase" },
];

export const TEAM_ROLES = [
  "developer",
  "quality assurance",
  "media",
  "volunteer",
  "officers",
  "treasurer",
];

export const EMPTY_PRODUCT_FILTERS: ProductFilters = {
  statuses: [],
  controls: [],
  batches: [],
  confirmedOn: "",
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  price: "",
  discount: "0",
  stocks: "",
  batch: "",
  description: "",
  start_date: "",
  end_date: "",
  category: "",
  type: "",
  control: "",
  selectedAudience: "",
  selectedVariations: [],
  selectedSizes: {},
  isEvent: false,
  eventDate: "",
  sessionConfig: {
    isMorningEnabled: false,
    morningTime: "07:30 - 12:00",
    isAfternoonEnabled: false,
    afternoonTime: "13:00 - 15:00",
    isEveningEnabled: false,
    eveningTime: "18:00 - 20:00",
  },
};

export const EMPTY_PRODUCT_IMAGES: ProductImageState = {
  files: [],
  previews: [],
  removedUrls: [],
};

const formatDateKey = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
};

export const getProductStatus = (product: MerchandiseItem): ProductStatus => {
  if (product.is_active === false) return "Inactive";
  if (isProductExpired(product.end_date)) return "Expired";
  if (Number(product.stocks || 0) <= 0) return "Out of Stock";
  return "Published";
};

export const formatPurchaseControl = (value?: string) => {
  const option = PURCHASE_CONTROLS.find((control) => control.value === value);
  return option?.label || value || "N/A";
};

export const formatCurrency = (value?: string | number) =>
  `₱${Number(value || 0).toLocaleString()}`;

const productSearchText = (product: MerchandiseItem) =>
  [
    product._id,
    product.name,
    product.category,
    product.price,
    product.batch,
    product.control,
    product.type,
    getProductStatus(product),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

// Sorting by status follows how sellable a product is rather than the
// alphabet, so ascending runs Published first and Expired last
const PRODUCT_STATUS_ORDER: ProductStatus[] = [
  "Published",
  "Out of Stock",
  "Inactive",
  "Expired",
];

const productSortValue = (
  product: MerchandiseItem,
  field: ProductSortField
) => {
  if (field === "status") {
    const rank = PRODUCT_STATUS_ORDER.indexOf(getProductStatus(product));
    //Products keep their alphabetical order inside each status group
    return `${rank}-${product.name || ""}`;
  }
  return String(product[field] || "");
};

const sortByText = <TRecord>(
  records: TRecord[],
  getValue: (record: TRecord) => string,
  direction: "asc" | "desc"
) =>
  [...records].sort((left, right) => {
    const result = getValue(left).localeCompare(getValue(right), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return direction === "asc" ? result : -result;
  });

const productFormFromRecord = (
  product?: MerchandiseItem | null
): ProductFormValues => {
  if (!product) return EMPTY_PRODUCT_FORM;

  const selectedSizes = Object.fromEntries(
    Object.entries(product.selectedSizes || {}).map(([size, details]) => [
      size,
      {
        custom: Boolean(details.custom),
        price: details.custom ? String(details.price || "") : "",
      },
    ])
  );

  return {
    ...EMPTY_PRODUCT_FORM,
    name: product.name || "",
    price: String(product.price || ""),
    stocks: String(product.stocks || ""),
    batch: String(product.batch || ""),
    description: product.description || "",
    start_date: formatDateKey(product.start_date),
    end_date: formatDateKey(product.end_date),
    category: product.category || "",
    type: product.type || "",
    control: product.control || "",
    selectedAudience: product.selectedAudience || "",
    selectedVariations: product.selectedVariations || [],
    selectedSizes,
  };
};

const sanitizeSelectedSizes = (
  selectedSizes: ProductFormValues["selectedSizes"]
) =>
  Object.fromEntries(
    Object.entries(selectedSizes).map(([size, details]) => [
      size,
      {
        custom: Boolean(details.custom),
        price: details.custom ? String(details.price || "") : "",
      },
    ])
  );

const appendProductFormData = (
  values: ProductFormValues,
  images: ProductImageState,
  createdBy: string
) => {
  const formData = new FormData();

  images.files.forEach((file) => formData.append("images", file));
  images.removedUrls.forEach((url) => formData.append("removeImage", url));

  formData.append("name", values.name);
  formData.append("price", values.price);
  formData.append("stocks", values.stocks);
  formData.append("batch", values.batch);
  formData.append("description", values.description);
  formData.append("selectedVariations", values.selectedVariations.join(","));
  formData.append(
    "selectedSizes",
    JSON.stringify(sanitizeSelectedSizes(values.selectedSizes))
  );
  formData.append("selectedAudience", values.selectedAudience);
  formData.append("created_by", createdBy);
  formData.append("start_date", values.start_date);
  formData.append("end_date", values.end_date);
  formData.append("category", values.category);
  formData.append("type", values.type);
  formData.append("control", values.control);
  formData.append("isEvent", String(values.isEvent));
  formData.append("eventDate", values.eventDate);
  formData.append("sessionConfig", JSON.stringify(values.sessionConfig));

  return formData;
};

export const useMerchandiseData = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<MerchandiseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productFilters, setProductFilters] = useState<ProductFilters>(
    EMPTY_PRODUCT_FILTERS
  );
  const [productSort, setProductSort] = useState<
    MerchandiseSort<ProductSortField>
  >({
    //Sellable products lead the table, expired ones sink to the bottom
    field: "status",
    direction: "asc",
  });
  const [productPage, setProductPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageMerchandise =
    normalizeCampus(user?.campus) === "UC_MAIN" &&
    (user?.access === PSITS_ROLES.ADMIN ||
      user?.access === PSITS_ROLES.FINANCE);

  const refreshProducts = useCallback(async () => {
    const productResult = await merchandiseAdmin();
    setProducts(productResult || []);
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await refreshProducts();
    } catch {
      setError("Unable to load merchandise data.");
    } finally {
      setIsLoading(false);
    }
  }, [refreshProducts]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const status = getProductStatus(product);
      const queryMatch = !query || productSearchText(product).includes(query);
      const statusMatch =
        productFilters.statuses.length === 0 ||
        productFilters.statuses.includes(status);
      const controlMatch =
        productFilters.controls.length === 0 ||
        productFilters.controls.includes(product.control || "");
      const batchMatch =
        productFilters.batches.length === 0 ||
        productFilters.batches.includes(String(product.batch || ""));
      const dateMatch =
        !productFilters.confirmedOn ||
        formatDateKey(product.start_date) === productFilters.confirmedOn;

      return (
        queryMatch && statusMatch && controlMatch && batchMatch && dateMatch
      );
    });

    return sortByText(
      filtered,
      (product) => productSortValue(product, productSort.field),
      productSort.direction
    );
  }, [productFilters, productSearch, productSort, products]);

  const tabCounts = useMemo<Record<MerchandiseSection, number>>(
    () => ({
      products: products.length,
    }),
    [products.length]
  );

  const productRows = filteredProducts.slice(
    (productPage - 1) * ROWS_PER_PAGE,
    productPage * ROWS_PER_PAGE
  );

  const productTotalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ROWS_PER_PAGE)
  );

  useEffect(() => {
    setProductPage(1);
  }, [productFilters, productSearch]);

  const toggleProductSort = (field: ProductSortField) => {
    setProductSort((current) =>
      current.field === field
        ? {
            field,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { field, direction: "asc" }
    );
  };

  const saveProduct = async (
    values: ProductFormValues,
    images: ProductImageState,
    existingProductId?: string
  ) => {
    if (!canManageMerchandise) {
      showToast("error", "Unauthorized.");
      return false;
    }

    setIsMutating(true);
    const formData = appendProductFormData(values, images, user?.name || "");

    try {
      const succeeded = existingProductId
        ? await updateMerchandise(existingProductId, formData)
        : await addMerchandise(formData);

      if (succeeded) {
        showToast(
          "success",
          existingProductId
            ? "Product updated successfully"
            : "Product added successfully"
        );
        await refreshProducts();
      }

      return succeeded;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setIsMutating(true);
    try {
      const succeeded = await deleteMerchandise(id);
      if (succeeded) {
        showToast("success", "Product deleted successfully");
        await refreshProducts();
      }
      return Boolean(succeeded);
    } finally {
      setIsMutating(false);
    }
  };

  //Push the end date of a lapsed sale forward, reusing the normal update
  //pipeline so every other field keeps its current value
  const extendProductSale = async (
    product: MerchandiseItem,
    endDate: string
  ) => {
    if (!canManageMerchandise) {
      showToast("error", "Unauthorized.");
      return false;
    }

    const values: ProductFormValues = {
      ...productFormFromRecord(product),
      end_date: endDate,
    };

    setIsMutating(true);
    const formData = appendProductFormData(
      values,
      EMPTY_PRODUCT_IMAGES,
      product.created_by || user?.name || ""
    );

    try {
      const succeeded = await updateMerchandise(product._id, formData);
      if (succeeded) {
        showToast("success", "Sale period extended successfully");
        await refreshProducts();
      }
      return Boolean(succeeded);
    } finally {
      setIsMutating(false);
    }
  };

  const publishProduct = async (id: string) => {
    setIsMutating(true);
    try {
      const succeeded = await publishMerchandise(id);
      if (succeeded) {
        showToast("success", "Product published successfully");
        await refreshProducts();
      }
      return Boolean(succeeded);
    } finally {
      setIsMutating(false);
    }
  };

  const searchStudent = async (idNumber: string) => {
    const result = await fetchStudentName(idNumber);
    if (!result?.data?.id_number) {
      showToast("error", "No student found");
      return null;
    }

    return {
      id_number: String(result.data.id_number),
      name: String(result.data.name || ""),
    };
  };

  const productBatches = useMemo(
    () =>
      Array.from(
        new Set(
          products.map((product) => String(product.batch || "")).filter(Boolean)
        )
      ),
    [products]
  );

  return {
    canManageMerchandise,
    deleteProduct,
    error,
    extendProductSale,
    filteredProducts,
    getProductFormValues: productFormFromRecord,
    isLoading,
    isMutating,
    productBatches,
    productFilters,
    productPage,
    productRows,
    productSearch,
    productTotalPages,
    products,
    publishProduct,
    refreshAll,
    saveProduct,
    searchStudent,
    setProductFilters,
    setProductPage,
    setProductSearch,
    tabCounts,
    toggleProductSort,
  };
};
