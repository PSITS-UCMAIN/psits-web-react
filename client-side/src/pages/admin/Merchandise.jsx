import { isAfter, isBefore } from "date-fns";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { InfinitySpin } from "react-loader-spinner";
import "swiper/swiper-bundle.css";
import "../../App.css";
import {
  deleteMerchandise,
  merchandiseAdmin,
  publishMerchandise,
} from "../../api/admin";
import ButtonsComponent from "../../components/Custom/ButtonsComponent";
import TableComponent from "../../components/Custom/TableComponent";
import FormButton from "../../components/forms/FormButton";
import {
  conditionalPosition,
  formattedDate,
} from "../../components/tools/clientTools";
import { showToast } from "../../utils/alertHelper";
import FilterOptions from "../students/merchandise/FilterOptions";
import EditProduct from "./EditProduct";
import Product from "./Product";

function Merchandise() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isFilterOptionOpen, setIsFilterOptionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddProductModal, setIsAddProductModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [merchToDelete, setMerchToDelete] = useState("");

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [merchToPublish, setMerchToPublish] = useState("");

  const [merchToEdit, setMerchToEdit] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedControls, setSelectedControls] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedVariations, setSelectedVariations] = useState([]);

  const filterOptionsRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await merchandiseAdmin();

      const sortedResult = result.sort((a, b) => {
        const statusOrder = {
          Publishing: 1,
          Expired: 2,
          Deleted: 3,
          Pending: 4,
        };

        const statusA = getStatus(a);
        const statusB = getStatus(b);

        if (a.is_active !== b.is_active) {
          return b.is_active - a.is_active;
        }

        return statusOrder[statusA] - statusOrder[statusB];
      });

      setData(sortedResult);
      setFilteredData(sortedResult);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data: ", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = data.filter((item) => {
      const id_number = item._id ? item._id.toLowerCase() : "";
      const name = item.name ? item.name.toLowerCase() : "";
      const category = item.category ? item.category.toLowerCase() : "";
      const price = item.price ? item.price : "";
      const batch = item.batch ? item.batch : "";
      const control = item.control ? item.control.toLowerCase() : "";

      return (
        id_number.includes(searchQuery.toLowerCase()) ||
        name.includes(searchQuery.toLowerCase()) ||
        category.includes(searchQuery.toLowerCase()) ||
        price.includes(searchQuery.toLowerCase()) ||
        batch.includes(searchQuery.toLowerCase()) ||
        control.includes(searchQuery.toLowerCase())
      );
    });
    setFilteredData(filtered);
  }, [searchQuery, data]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterOptionsRef.current &&
        !filterOptionsRef.current.contains(event.target)
      ) {
        setIsFilterOptionOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleView = (item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const handleOpenAddProduct = () => {
    setIsAddProductModal(true);
  };

  const handleCloseAddProduct = () => {
    setLoading(true);
    fetchData();
    setIsAddProductModal(false);
    setLoading(false);
  };

  const handleOpenEditModal = (row) => {
    setMerchToEdit(row);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    fetchData();
  };

  const deleteMerchandiseApi = async () => {
    if (await deleteMerchandise(merchToDelete)) {
      showToast("success", "Merchandise Deleted");
      setDeleteModalOpen(false);
      fetchData();
    }
  };
  const publishMerchandiseApi = async () => {
    if (await publishMerchandise(merchToPublish)) {
      showToast("success", "Merchandise Publish!");
      setPublishModalOpen(false);
      fetchData();
    }
  };

  const handleDeleteProductModal = (id) => {
    setMerchToDelete(id);
    setDeleteModalOpen(true);
  };
  const handlePublishProductModal = (id) => {
    setMerchToPublish(id);
    setPublishModalOpen(true);
  };

  const getStatus = (row) => {
    const currentDate = new Date();
    const startDate = new Date(formattedDate(row.start_date));
    const endDate = new Date(formattedDate(row.end_date));

    if (isBefore(currentDate, startDate)) {
      return row.is_active ? "Publishing" : "Pending";
    } else if (isAfter(currentDate, endDate)) {
      return !row.is_active ? "Deleted" : "Expired";
    } else {
      return row.is_active ? "Publishing" : "Deleted";
    }
  };

  const columns = [
    {
      key: "select",
      label: (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <input
            type="checkbox"
            checked={selectAll}
            onChange={() => setSelectAll(!selectAll)}
          />
        </motion.div>
      ),
      cell: (row) => (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <input
            type="checkbox"
            checked={selectedRows.includes(row.id_number)}
            onChange={() => handleRowSelection(row.id_number)}
          />
        </motion.div>
      ),
    },

    {
      key: "name",
      label: "Product",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center justify-center md:justify-start gap-2 ">
          <img
            src={row.imageUrl[0]}
            alt={row.name}
            width="50"
            height="50"
            className="rounded-md shadow-sm object-cover"
          />
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
    },

    {
      key: "batch",
      label: "Batch",
      sortable: true,
      cell: (row) => `Batch ${row.batch}`,
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      cell: (row) => `₱ ${row.price}`,
    },
    {
      key: "control",
      label: "Product Controls",
      sortable: true,
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      cell: (row) => (
        <div className="text-center">
          <span
            className={`px-2 py-1 rounded text-xs ${
              getStatus(row) === "Publishing"
                ? "bg-green-200 text-green-800"
                : getStatus(row) === "Expired"
                ? "bg-yellow-200 text-yellow-800"
                : getStatus(row) === "Deleted"
                ? "bg-red-200 text-red-800"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {getStatus(row)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      cell: (row) => (
        <ButtonsComponent>
          <FormButton
            type="button"
            text="View"
            onClick={() => handleView(row)}
            styles="bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center gap-2"
            icon={<i className="fas fa-eye text-sm"></i>}
            textClass="ml-2 md:inline"
            iconClass="text-sm text-base"
          />
          {conditionalPosition() && (
            <>
              <FormButton
                type="button"
                text="Edit"
                onClick={() => handleOpenEditModal(row)}
                styles="bg-green-200 text-green-800 hover:bg-green-200 active:bg-green-300 rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center gap-2"
                icon={<i className="fas fa-edit text-sm"></i>}
                textClass="ml-2 md:inline"
                iconClass="text-sm text-base"
              />

              {row.is_active && (
                <FormButton
                  type="button"
                  text="Delete"
                  onClick={() => handleDeleteProductModal(row._id)}
                  styles="bg-red-100 text-pink-800 hover:bg-red-200 active:bg-red-300 rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center gap-2"
                  icon={<i className="fas fa-trash text-sm"></i>}
                  textClass="ml-2 md:inline"
                  iconClass="text-sm text-base"
                />
              )}
              {!row.is_active && (
                <FormButton
                  type="button"
                  text="Publish"
                  onClick={() => handlePublishProductModal(row._id)}
                  styles="bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2"
                  icon={<i className="fas fa-pen text-sm"></i>}
                  textClass="ml-2 md:inline"
                  iconClass="text-sm text-base"
                />
              )}
            </>
          )}
        </ButtonsComponent>
      ),
    },
  ];

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(filteredData.map((item) => item.id_number));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, filteredData]);

  const handleRowSelection = (id_number) => {
    setSelectedRows((prevSelectedRows) =>
      prevSelectedRows.includes(id_number)
        ? prevSelectedRows.filter((id) => id !== id_number)
        : [...prevSelectedRows, id_number]
    );
  };

  const handleCategoryChange = (category, checked) => {
    setSelectedCategories((prevState) =>
      checked
        ? [...prevState, category]
        : prevState.filter((c) => c !== category)
    );
  };

  const handleControlChange = (control, checked) => {
    setSelectedControls((prevState) =>
      checked ? [...prevState, control] : prevState.filter((c) => c !== control)
    );
  };

  const handleSizeChange = (size, checked) => {
    setSelectedSizes((prevState) =>
      checked ? [...prevState, size] : prevState.filter((c) => c !== size)
    );
  };

  const handleVariationChange = (variation, checked) => {
    setSelectedVariations((prevState) =>
      checked
        ? [...prevState, variation]
        : prevState.filter((v) => v !== variation)
    );
  };

  const applyFilters = () => {
    const filtered = data.filter((item) => {
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(item.category);
      const controlMatch =
        selectedControls.length === 0 ||
        selectedControls.includes(item.control);
      const sizeMatch =
        selectedSizes.length === 0 || selectedSizes.includes(item.size);
      const variationMatch =
        selectedVariations.length === 0 ||
        selectedVariations.includes(item.variation);

      return categoryMatch && controlMatch && sizeMatch && variationMatch;
    });

    setFilteredData(filtered);
  };

  return (
    <div className="py-4 relative">
      {loading ? (
        <div className="flex justify-center items-center w-full h-full">
          <InfinitySpin
            visible={true}
            width={200}
            color="#0d6efd"
            ariaLabel="infinity-spin-loading"
          />
        </div>
      ) : (
        <>
          <div className=" flex flex-col gap-2 md:flex-row md:justify-between md:items-center p-2">
            <motion.h1
              whileHover={{ scale: 1.05 }}
              className="text-3xl text-gray-700 text-center md:text-left"
            ></motion.h1>
          </div>
          <div className="overflow-x-auto">
            <TableComponent
              columns={columns}
              data={filteredData}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              customButtons={
                conditionalPosition() && (
                  <ButtonsComponent>
                    {/* Filters Button */}

                    {/* Add Product Button */}
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: "#0056b3" }} // Hover effect for primary
                      whileTap={{ scale: 0.98, backgroundColor: "#003d7a" }} // Active effect for primary
                      className="text-sm md:text-base bg-accent text-white flex items-center gap-2 px-5 py-2 border border-neutral-medium rounded-lg shadow-sm hover:shadow-md transition ease-in-out duration-150 focus:outline-none focus:ring-2 focus:ring-highlight"
                      onClick={handleOpenAddProduct}
                    >
                      <i className="fas fa-plus text-white"></i>
                      <span className="font-medium">Add </span>
                    </motion.button>
                  </ButtonsComponent>
                )
              }
            />
          </div>
        </>
      )}

      {/* Filter Options */}
      {isFilterOptionOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div
            ref={filterOptionsRef}
            className="bg-white p-4 rounded shadow-lg"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Filter Options</h2>
              <button
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setIsFilterOptionOpen(false)}
              >
                &times;
              </button>
            </div>
            <FilterOptions
              selectedCategories={selectedCategories}
              selectedControls={selectedControls}
              selectedSizes={selectedSizes}
              selectedVariations={selectedVariations}
              handleCategoryChange={handleCategoryChange}
              handleControlChange={handleControlChange}
              handleSizeChange={handleSizeChange}
              handleVariationChange={handleVariationChange}
            />
            <div className="mt-4 flex justify-end">
              <FormButton
                type="button"
                text="Apply"
                onClick={() => {
                  applyFilters();
                  setIsFilterOptionOpen(false);
                }}
                styles="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* View Product Modal */}

      {isViewModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Semi-transparent background */}
          <div
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            onClick={() => setIsViewModalOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="bg-white rounded-xl shadow-xl min-w-96 md:min-w-[450px] w-fit z-10 overflow-hidden transform transition-all duration-300 scale-95">
            {/* Header */}
            <div className="flex justify-between items-center p-6 bg-navy text-white rounded-t-xl shadow-md">
              <h5 className="text-xl font-primary font-bold">
                {selectedItem?.name}
              </h5>
              <button
                type="button"
                className="text-3xl leading-none hover:text-gray-200 focus:outline-none"
                aria-label="Close"
                onClick={() => setIsViewModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 bg-gray-50 text-gray-800">
              {/* Product Image */}
              <div className="mb-4 w-full">
                <img
                  src={selectedItem?.imageUrl[0]}
                  alt={selectedItem?.name}
                  className="w-min h-14 object-cover rounded-md"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Price:</span>
                  <span className="text-sm">₱{selectedItem?.price}</span>
                </div>

                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Stocks:</span>
                  <span className="text-sm">{selectedItem?.stocks}</span>
                </div>

                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Batch:</span>
                  <span className="text-sm">{selectedItem?.batch}</span>
                </div>

                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Description:</span>
                  <span className="text-sm">{selectedItem?.description}</span>
                </div>
                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Variation:</span>
                  <span className="text-sm">
                    {selectedItem?.selectedVariations
                      .map((sizes) => sizes)
                      .join(", ")}
                  </span>
                </div>
                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Sizes:</span>
                  <span className="text-sm">
                    {" "}
                    {selectedItem?.selectedSizes
                      .map((sizes) => sizes)
                      .join(", ")}
                  </span>
                </div>
                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Audience:</span>
                  <span className="text-sm">
                    {selectedItem?.selectedAudience}
                  </span>
                </div>
                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Category:</span>
                  <span className="text-sm">{selectedItem?.category}</span>
                </div>

                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Start Date:</span>
                  <span className="text-sm">{selectedItem?.start_date}</span>
                </div>

                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">End Date:</span>
                  <span className="text-sm">{selectedItem?.end_date}</span>
                </div>

                <div className="flex items-center font-secondary justify-between gap-10">
                  <span className="font-medium text-lg">Created By:</span>
                  <span className="text-sm">{selectedItem?.created_by}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 bg-white border-t border-gray-200 rounded-b-xl">
              <button
                type="button"
                className="px-5 py-2 text-gray-500 hover:text-gray-700 transition-all focus:outline-none rounded-md border border-gray-300 hover:border-gray-400"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <EditProduct
          handleCloseEditProduct={handleCloseEditModal}
          merchData={merchToEdit}
        />
      )}
      {/* Add Product Modal */}
      {isAddProductModal && (
        <Product handleCloseAddProduct={handleCloseAddProduct} />
      )}
      {deleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
            <p>Are you sure you want to delete this product?</p>
            <div className="mt-6 flex justify-end">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded mr-2"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={deleteMerchandiseApi}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {publishModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Confirm Publish</h2>
            <p>Are you sure you want to publish again this product?</p>
            <div className="mt-6 flex justify-end">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded mr-2"
                onClick={() => setPublishModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={publishMerchandiseApi}
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Merchandise;
