import React, { useState, useEffect } from "react";
import { showToast } from "../../utils/alertHelper";
import { addMerchandise } from "../../api/admin";
import { getInformationData } from "../../authentication/Authentication";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import FormButton from "../../components/forms/FormButton";
import FormTextArea from "../../components/forms/FormTextArea";
import ImageInput from "../../components/forms/ImageInput";
import { format } from "date-fns";
import { InfinitySpin } from "react-loader-spinner";
import ToggleSwitch from "../../components/common/ToggleSwitch";

function Product({ handleCloseAddProduct }) {
  const user = getInformationData();
  const today = new Date().toISOString().split("T")[0];
  const [isLoading, setIsLoading] = useState(false);
  const variation = [
    "White",
    "Purple",
    "Black",
    "Red",
    "Yellow",
    "Orange",
    "Blue",
    "Green",
    "Pink",
    "Gray",
    "Brown",
    "Cyan",
    "Magenta",
    "Teal",
    "Maroon",
    "Innovatio",
    "Paradox",
    "BSIT Wave",
  ];
  const size = [
    "18",
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

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stocks: "",
    batch: "",
    description: "",
    start_date: "",
    end_date: "",
    category: "",
    type: "",
    created_by: user.name,
    control: "",
    selectedSizes: [],
    selectedVariations: [],
    selectedAudience: "",

    eventDate: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    price: "",
    stocks: "",
    start_date: "",
    end_date: "",
    category: "",
    type: "",
    control: "",
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState({});
  const [isShown, setIsShown] = useState(false);
  const [isVariation, setVariation] = useState(false);

  const [isEventType, setIsEventType] = useState(false);

  const toggleIsEventType = () => {
    setIsEventType((prev) => !prev);
  };

  useEffect(() => {
    if (
      formData.type.includes("Uniform") ||
      formData.type.includes("Tshirt") ||
      formData.type.includes("Tshirt w/ Bundle")
    ) {
      setIsShown(true);
    } else if (formData.type.includes("Item")) {
      setVariation(true);
    } else {
      setIsShown(false);
      setVariation(false);
    }
  }, [formData.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) {
      showToast("error", "You can only upload up to 3 images");
      return;
    }

    setImages((prevImages) => [...prevImages, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
  };

  const handleRemoveImage = (index) => {
    setImages((prevImages) => {
      const updatedImages = prevImages.filter((_, i) => i !== index);
      return updatedImages;
    });

    setImagePreviews((prevPreviews) => {
      const updatedPreviews = prevPreviews.filter((_, i) => i !== index);
      return updatedPreviews;
    });
  };

  const validate = () => {
    let errors = {};

    if (formData.name.length === 0) {
      errors.name = "Product Name is required.";
      showToast("error", errors.name);
    }
    if (formData.control.length === 0) {
      errors.control = "Product Control is required.";
      showToast("error", errors.control);
    }
    if (formData.type.length === 0) {
      errors.type = "Product Type is required.";
      showToast("error", errors.type);
    }

    if (!formData.price) {
      errors.price = "Price is required.";
      showToast("error", errors.price);
    } else if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      errors.price = "Price must be a positive number.";
      showToast("error", errors.price);
    }

    if (formData.stocks.length === 0) {
      errors.stocks = "Stocks must be filled.";
      showToast("error", errors.stocks);
    } else if (isNaN(formData.stocks) || parseInt(formData.stocks) <= 0) {
      errors.stocks = "Stocks must be a non-negative integer.";
      showToast("error", errors.stocks);
    }
    if (formData.category === "") {
      errors.category = "Category must filled up";
      showToast("error", errors.category);
    }

    if (!formData.start_date) {
      errors.start_date = "Start date is required.";
      showToast("error", errors.start_date);
    }

    if (!formData.end_date) {
      errors.end_date = "End date is required.";
      showToast("error", errors.end_date);
    } else if (
      formData.start_date &&
      new Date(formData.end_date) < new Date(formData.start_date)
    ) {
      errors.end_date = "End date must be after the start date.";
      showToast("error", errors.end_date);
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePreview = (e) => {
    e.preventDefault();
    if (validate()) {
      setPreviewData(formData);
      setShowPreview(true);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    const data = new FormData();

    if (images) {
      images.forEach((image) => data.append("images", image));
    }

    for (const key in formData) {
      let value = formData[key];
      if (Array.isArray(value)) {
        value = value.join(",");
      }
      data.append(key, value);
    }

    data.append("isEvent", isEventType);

    try {
      if (await addMerchandise(data)) {
        showToast("success", "Merchandise Published");
        handleCloseAddProduct();
        setShowPreview(false);
        setIsLoading(false);
      }
    } catch (error) {
      showToast("error", error.message);
      setIsLoading(false);
    }
  };

  const handleSizeClick = (size) => {
    setFormData((prevState) => {
      const selectedSizesArray = Array.isArray(prevState.selectedSizes)
        ? prevState.selectedSizes
        : prevState.selectedSizes.split(",");

      const isSelected = selectedSizesArray.includes(size);
      const newSelectedSizes = isSelected
        ? selectedSizesArray.filter((s) => s !== size)
        : [...selectedSizesArray, size];

      return {
        ...prevState,
        selectedSizes: newSelectedSizes,
      };
    });
  };

  const handleVariationClick = (variation) => {
    setFormData((prevState) => {
      const selectedVariationsArray = Array.isArray(
        prevState.selectedVariations
      )
        ? prevState.selectedVariations
        : prevState.selectedVariations.split(",");

      const isSelected = selectedVariationsArray.includes(variation);
      const newSelectedVariations = isSelected
        ? selectedVariationsArray.filter((v) => v !== variation)
        : [...selectedVariationsArray, variation];

      return {
        ...prevState,
        selectedVariations: newSelectedVariations,
      };
    });
  };

  const categoryOptions = [
    { value: "uniform", label: "Uniform" },
    { value: "intramurals", label: "Intramurals" },
    { value: "ict-congress", label: "ICT Congress" },
    { value: "merchandise", label: "Merchandise" },
    { value: "acquintance", label: "Acquintance" },
  ];

  const typeOptions = {
    uniform: [{ value: "Uniform", label: "Uniform" }],
    intramurals: [
      { value: "Tshirt", label: "T-shirt" },
      { value: "Ticket", label: "Ticket" },
      { value: "Others", label: "Others" },
    ],
    "ict-congress": [{ value: "Tshirt w/ Bundle", label: "Tshirt w/ Bundle" }],
    merchandise: [
      { value: "Tshirt", label: "Tshirt" },
      { value: "Item", label: "Item" },
    ],
    acquintance: [
      { value: "Ticket w/ Bundle", label: "Ticket w/ Bundle" },
      { value: "Others", label: "Others" },
    ],
  };

  const purchaseControlOptions = [
    { value: "limited-purchase", label: "Limited Purchase" },
    { value: "bulk-purchase", label: "Bulk Purchase" },
  ];
  const audience = [
    { value: "all", label: "All" },
    { value: "officers", label: "Officers" },
    {
      value: "volunteer,media,developer",
      label: "Volunteers, Media and Developers",
    },
  ];

  const getTypeOptions = (category) => {
    return typeOptions[category] || [];
  };

  const PreviewModal = ({ data, images, onClose, onConfirm, isLoading }) => {
    const imagesToShow = images.slice(0, 3);

    return (
      <div>
        {/** Semi-transparent background */}
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"></div>

          {/** Modal Container */}
          <div className="bg-white rounded-xl shadow-xl min-w-96 md:min-w-[450px] w-fit z-10 overflow-hidden transform transition-all duration-300 scale-95">
            {/** Header */}
            <div className="flex justify-between items-center p-6 bg-navy text-white rounded-t-xl shadow-md">
              <h5 className="text-xl font-primary font-bold">Preview</h5>
              <button
                type="button"
                className="text-3xl leading-none hover:text-gray-200 focus:outline-none"
                aria-label="Close"
                onClick={onClose}
              >
                &times;
              </button>
            </div>

            {/** Body */}
            <div className="p-6 space-y-3 bg-gray-50 text-gray-800">
              {imagesToShow.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {imagesToShow.map((image, index) => (
                    <img
                      key={index}
                      src={URL.createObjectURL(image)}
                      alt={`Product Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-md shadow-sm border border-gray-200"
                    />
                  ))}
                  {images.length > 3 && (
                    <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-md shadow-sm border border-gray-200">
                      <p className="text-xs text-gray-500">
                        +{images.length - 3} more
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="text-gray-700 space-y-1">
                {Object.entries({
                  "Product Name": data.name,
                  Price: `₱${data.price}`,
                  Stocks: data.stocks,
                  Batch: data.batch,
                  Category: data.category,
                  Type: data.type,
                  Description: data.description,
                  "Purchase Control": data.control,
                  "Start Date": data.start_date,
                  "End Date": data.end_date,
                  Sizes: data.selectedSizes.join(", "),
                  Variations: data.selectedVariations.join(", "),
                }).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-10"
                  >
                    <span className="font-medium text-md">{label}:</span>
                    <span className="text-md">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/** Footer */}
            <div className="flex items-center justify-end p-6 bg-white border-t border-gray-200 rounded-b-xl">
              <button
                type="button"
                className="px-5 py-2 text-gray-500 hover:text-gray-700 transition-all focus:outline-none rounded-md border border-gray-300 hover:border-gray-400"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ml-3 px-6 py-2 bg-navy text-white rounded-md hover:shadow-lg hover:bg-primary focus:outline-none transition-all duration-300 ease-in-out"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="relative flex items-center">
                    <div className="dot-container">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    <style jsx>{`
                      .dot-container {
                        display: flex;
                        justify-content: space-between;
                        width: 50px;
                        height: 20px;
                      }
                      .dot {
                        width: 8px;
                        height: 8px;
                        background-color: white;
                        border-radius: 50%;
                        animation: bounce 1s infinite;
                      }
                      .dot:nth-child(2) {
                        animation-delay: 0.2s;
                      }
                      .dot:nth-child(3) {
                        animation-delay: 0.4s;
                      }
                      @keyframes bounce {
                        0%,
                        100% {
                          transform: translateY(10px);
                        }
                        50% {
                          transform: translateY(-8px);
                        }
                      }
                    `}</style>
                  </div>
                ) : (
                  "Approve"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="loader"></div>
          <p className="ml-4 text-white">Uploading product, please wait...</p>
        </div>
      ) : (
        <div className="relative h-[90%] max-w-md w-full mx-4 md:mx-8 p-6 bg-white rounded-lg shadow-lg overflow-y-auto">
          <button
            onClick={handleCloseAddProduct}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
          <h2 className="text-2xl font-semibold mb-4">Add Product</h2>
          <form onSubmit={handlePreview} className="space-y-6">
            <ImageInput
              label={"Product Image"}
              handleImageChange={handleImageChange}
              multiple={true}
              previews={imagePreviews}
              onRemoveImage={handleRemoveImage}
            />
            <FormInput
              label="Product Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              labelStyle="text-sm"
              inputStyle="text-sm"
            />
            <div className="flex flex-col md:flex-row gap-4">
              <FormInput
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                labelStyle="text-sm"
                inputStyle="text-sm"
              />
              <FormInput
                label="Stocks"
                name="stocks"
                type="number"
                value={formData.stocks}
                onChange={handleChange}
                labelStyle="text-sm"
                inputStyle="text-sm"
              />
              <FormInput
                label="Batch"
                name="batch"
                type="number"
                value={formData.batch}
                onChange={handleChange}
                labelStyle="text-sm"
                inputStyle="text-sm"
              />
            </div>
            <FormTextArea
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleChange}
              labelStyle="text-sm"
              inputStyle="text-sm"
            />
            <div className="flex flex-col md:flex-row gap-4">
              <FormSelect
                name="category"
                label="Category"
                options={categoryOptions}
                value={formData.category}
                onChange={handleChange}
                labelStyle="text-sm"
                optionStyle="text-sm"
                styles="flex-1"
              />
              <FormSelect
                name="type"
                label="Type"
                options={getTypeOptions(formData.category)}
                value={formData.type}
                onChange={handleChange}
                styles="flex-1"
                labelStyle="text-sm"
                optionStyle="text-sm"
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-row relative gap-4">
                <label
                  htmlFor="start_date"
                  className="text-gray-500 mb-1 text-sm"
                >
                  Is Merch of Event type?
                </label>
                <ToggleSwitch
                  isToggled={isEventType}
                  onToggle={toggleIsEventType}
                />
              </div>
            </div>
            {isEventType && (
              <div className="flex flex-col relative">
                <label htmlFor="eventDate" className="text-gray-500 mb-1">
                  Event Date
                </label>
                <FormInput
                  label=""
                  name="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={handleChange}
                  labelStyle="text-sm"
                  inputStyle="text-sm"
                  error={errors.eventDate}
                  max={today}
                />
              </div>
            )}
            <FormSelect
              name="control"
              label="Purchase Control"
              options={purchaseControlOptions}
              value={formData.control}
              onChange={handleChange}
              labelStyle="text-sm"
              optionStyle="text-sm"
            />
            <FormSelect
              name="selectedAudience"
              label="Select Audience"
              options={audience}
              value={formData.selectedAudience}
              onChange={handleChange}
              labelStyle="text-sm"
              optionStyle="text-sm"
            />

            <div className="flex flex-col gap-4 text-sm">
              {isShown && (
                <div>
                  <p className="font-semibold">Sizes:</p>
                  <div className="flex gap-2 flex-wrap">
                    {size.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSizeClick(s)}
                        className={`p-2 border rounded ${
                          formData.selectedSizes.includes(s)
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-800"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(isShown || isVariation) && (
                <div>
                  <p className="font-semibold">Variations:</p>
                  <div className="flex gap-2 flex-wrap text-sm">
                    {variation.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleVariationClick(v)}
                        className={`p-2 border rounded ${
                          formData.selectedVariations.includes(v)
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-800"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-col relative">
                <label htmlFor="start_date" className="text-gray-500 mb-1">
                  Start Date
                </label>
                <FormInput
                  label=""
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  labelStyle="text-sm"
                  inputStyle="text-sm"
                  error={errors.start_date}
                  max={today}
                />
              </div>
              <div className="flex flex-col relative">
                <label htmlFor="end_date" className="text-gray-500 mb-1">
                  End Date
                </label>
                <FormInput
                  label=""
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  labelStyle="text-sm"
                  inputStyle="text-sm"
                  error={errors.end_date}
                  max={today}
                />
              </div>
            </div>

            <FormButton
              type="button"
              text="Preview"
              onClick={handlePreview}
              styles="w-full bg-[#002E48] p-2 rounded text-white"
            />
          </form>
          {showPreview && (
            <PreviewModal
              data={previewData}
              images={images}
              onClose={() => setShowPreview(false)}
              onConfirm={handleConfirm}
              isLoading={isLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default Product;
