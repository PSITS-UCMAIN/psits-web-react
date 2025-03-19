import React, { useState, useEffect } from "react";
import SearchFilter from "./merchandise/SearchFilter";
import { merchandise } from "../../api/admin";
import ProductList from "./merchandise/ProductList";
import ButtonsComponent from "../../components/Custom/ButtonsComponent";
import FormButton from "../../components/forms/FormButton";
import { FaFilter, FaShoppingCart } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import FilterOptions from "./merchandise/FilterOptions";
import { motion, AnimatePresence } from "framer-motion";
import Pagination from "../../components/Custom/Pagination";
import { getInformationData } from "../../authentication/Authentication";
import { fetchSpecificStudent } from "../../api/students";

const StudentMerchandise = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOptionOpen, setIsFilterOptionOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedControls, setSelectedControls] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const userData = getInformationData();
  const [isRequest, setIsRequest] = useState(false);

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05, transition: { duration: 0.3 } },
    tap: { scale: 0.95, transition: { duration: 0.2 } },
  };

  const navigate = useNavigate();

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFetchSpecificStudent = async () => {
    const result = await fetchSpecificStudent(userData.id_number);

    if (result) {
      setIsRequest(result.isRequest);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedControls([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setStartDate("");
    setEndDate("");
    setMinPrice("");
    setMaxPrice("");
    setCurrentPage(1);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories((prevState) =>
      prevState.includes(category)
        ? prevState.filter((c) => c !== category)
        : [...prevState, category]
    );
  };

  const handleControlChange = (control) => {
    setSelectedControls((prevState) =>
      prevState.includes(control)
        ? prevState.filter((c) => c !== control)
        : [...prevState, control]
    );
  };

  const handleSizeChange = (size) => {
    setSelectedSizes((prevState) =>
      prevState.includes(size)
        ? prevState.filter((s) => s !== size)
        : [...prevState, size]
    );
  };

  const handleColorChange = (color) => {
    setSelectedColors((prevState) =>
      prevState.includes(color)
        ? prevState.filter((c) => c !== color)
        : [...prevState, color]
    );
  };

  const handleStartDateChange = (date) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
  };

  const handlePriceChange = (value, type) => {
    if (type === "min") {
      setMinPrice(value);
    } else {
      setMaxPrice(value);
    }
  };

  const toggleFilterOption = () => {
    setIsFilterOptionOpen((prevState) => !prevState);
  };
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await merchandise();

      const currentDate = new Date();

      const filteredProducts = result.filter((item) => {
        const startDate = new Date(item.start_date);
        const endDate = new Date(item.end_date);

        const selectedAudienceArray = item.selectedAudience.includes(",")
          ? item.selectedAudience.split(",").map((aud) => aud.trim())
          : [item.selectedAudience];

        return (
          currentDate <= endDate &&
          (selectedAudienceArray.some(
            (audience) => userData.audience.includes(audience) && !isRequest
          ) ||
            selectedAudienceArray.includes("all"))
        );
      });

      setProducts(filteredProducts);
    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    handleFetchSpecificStudent();
  }, [isRequest]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleCart = () => navigate("../cart");

  // Filter and paginate products
  const filteredProducts = products.filter((product) => {
    const name = product.name ? product.name.toLowerCase() : "";
    const category = product.category ? product.category.toLowerCase() : "";
    const control = product.control ? product.control.toLowerCase() : "";

    const sizes = Array.isArray(product.selectedSizes)
      ? product.selectedSizes
      : [];
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const productStartDate = new Date(product.start_date);
    const productEndDate = new Date(product.end_date);

    const matchesSearchQuery = name.includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(category);
    const matchesControl =
      selectedControls.length === 0 || selectedControls.includes(control);
    const matchesSize =
      selectedSizes.length === 0 ||
      selectedSizes.some((size) => sizes.includes(size));
    const matchesColor =
      selectedColors.length === 0 ||
      selectedColors.some((color) => colors.includes(color));

    const matchesStartDate =
      !startDate || productStartDate >= new Date(startDate);
    const matchesEndDate = !endDate || productEndDate <= new Date(endDate);
    const matchesMinPrice = !minPrice || product.price >= Number(minPrice);
    const matchesMaxPrice = !maxPrice || product.price <= Number(maxPrice);

    return (
      matchesSearchQuery &&
      matchesCategory &&
      matchesControl &&
      matchesSize &&
      matchesColor &&
      matchesStartDate &&
      matchesEndDate &&
      matchesMinPrice &&
      matchesMaxPrice
    );
  });

  // Calculate the products to display based on pagination
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-[1600px] mx-auto py-5">
      <SearchFilter
        searchQuery={searchQuery}
        handleSearchChange={handleSearchChange}
        customButtons={
          <ButtonsComponent style="self-stretch flex-1 justify-between">
            <div className="relative">
              <FormButton
                text="Filter"
                icon={<FaFilter />}
                onClick={toggleFilterOption}
                styles="self-stretch bg-neutral-medium hover:bg-neutral-dark hover:text-neutral-light rounded-md flex items-center text-md lg:text-xl gap-2 p-3"
                textClass="text-sm"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              />
              <AnimatePresence>
                {isFilterOptionOpen && (
                  <FilterOptions
                    onCategoryChange={handleCategoryChange}
                    selectedCategories={selectedCategories}
                    onControlChange={handleControlChange}
                    selectedControls={selectedControls}
                    onSizeChange={handleSizeChange}
                    selectedSizes={selectedSizes}
                    onColorChange={handleColorChange}
                    selectedColors={selectedColors}
                    onStartDateChange={handleStartDateChange}
                    startDate={startDate}
                    onEndDateChange={handleEndDateChange}
                    endDate={endDate}
                    onPriceChange={handlePriceChange}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    onClose={toggleFilterOption}
                    onReset={handleReset}
                  />
                )}
              </AnimatePresence>
            </div>
            <FormButton
              onClick={handleCart}
              text="Cart"
              icon={<FaShoppingCart />}
              styles="self-stretch bg-primary text-neutral-light hover:bg-secondary hover:text-accent rounded-md flex items-center text-md lg:text-xl gap-2 p-3"
              textClass="text-sm"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            />
          </ButtonsComponent>
        }
      />
      <ProductList products={paginatedProducts} isLoading={isLoading} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        handlePageChange={handlePageChange}
      />
    </div>
  );
};

export default StudentMerchandise;
