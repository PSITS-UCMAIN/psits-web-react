import { useState, useEffect } from "react";
import { membership, merchandiseAdmin } from "../../api/admin";
import Modal from "../../components/common/modal/Modal";
import SearchDropdown from "../search/SearchDropdown";
import PropTypes from "prop-types";
import TextInput from "../common/TextInput";
import Button from "../../components/common/Button";
import { getInformationData } from "../../authentication/Authentication";
import { TailSpin } from "react-loader-spinner";

const AddOrderModal = ({ handleClose = () => {}, onCreateOrder }) => {
  const [studentOptions, setStudentOptions] = useState([]);
  const [merchOptions, setMerchOptions] = useState([]);
  const [student, setStudent] = useState(null);
  const [item, setItem] = useState(null);
  const [size, setSize] = useState("");
  const [variation, setVariation] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [finalPrice, setFinalPrice] = useState(0);
  const [discount, setDiscount] = useState(0); // percentage

  const user = getInformationData();

  useEffect(() => {
    const fetchMerchOptions = async () => {
      const temp = await merchandiseAdmin();
      setMerchOptions(
        temp
          .filter((opt) => opt.is_active === true)
          .map((opt) => {
            // Normalize selectedSizes: array → object
            let normalizedSizes = {};
            if (Array.isArray(opt.selectedSizes)) {
              normalizedSizes = opt.selectedSizes.reduce((acc, sizeObj) => {
                if (sizeObj.size != null && sizeObj.price != null) {
                  acc[sizeObj.size] = { price: parseFloat(sizeObj.price) };
                }
                return acc;
              }, {});
            } else if (
              opt.selectedSizes &&
              typeof opt.selectedSizes === "object"
            ) {
              normalizedSizes = Object.keys(opt.selectedSizes).reduce(
                (acc, key) => {
                  const val = opt.selectedSizes[key];
                  acc[key] = {
                    price:
                      typeof val.price === "number"
                        ? val.price
                        : parseFloat(val.price) || 0,
                  };
                  return acc;
                },
                {}
              );
            }

            // ✅ Normalize selectedVariations: array of objects → array of strings
            let normalizedVariations = [];
            if (Array.isArray(opt.selectedVariations)) {
              normalizedVariations = opt.selectedVariations
                .map((v) => {
                  // Handle both { variation: "Red" } and plain strings
                  if (typeof v === "string") return v;
                  if (v && v.variation) return v.variation;
                  if (v && v.name) return v.name; // fallback
                  return null;
                })
                .filter(Boolean); // remove null/undefined
            } else if (Array.isArray(opt.variations)) {
              // Some APIs use "variations" instead of "selectedVariations"
              normalizedVariations = opt.variations
                .map((v) =>
                  typeof v === "string" ? v : v?.variation || v?.name || null
                )
                .filter(Boolean);
            } else if (typeof opt.selectedVariations === "string") {
              // Rare: comma-separated string?
              normalizedVariations = opt.selectedVariations
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            }

            return {
              label: `${opt.name}`,
              value: {
                ...opt,
                selectedSizes: normalizedSizes,
                selectedVariations: normalizedVariations, // ✅ now array of strings
              },
            };
          })
      );
    };

    const fetchStudentOptions = async () => {
      try {
        setIsLoading(true);
        const result = await membership();
        setStudentOptions(
          result.map((student) => ({
            label: `${student.id_number} - ${student.first_name} ${student.last_name}`,
            value: student,
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchOptions();
    fetchStudentOptions();
  }, []);

  useEffect(() => {
    if (!item) {
      setItem(null);
      setAmount("0.00");
      setFinalPrice(0);
      return;
    }

    if (quantity <= 0) return;
    let price = 0;

    // Case 1: Item has sizes → use selected size price
    if (item.selectedSizes && size) {
      const selected = item.selectedSizes[size];
      if (selected && typeof selected.price === "number") {
        price = selected.price;
      }
    }
    // Case 2: No sizes → use base price
    else if (typeof item.price === "number") {
      price = item.price;
    }

    const subtotal = price * quantity;

    // Apply discount if any
    const discountAmount = discount > 0 ? (subtotal * discount) / 100 : 0;
    const total = (subtotal - discountAmount).toFixed(2);

    setAmount(subtotal.toFixed(2)); // before discount
    setFinalPrice(total); // after discount
  }, [item, size, quantity, discount]);

  const validateForm = () => {
    let tempErrors = {};
    if (!student) tempErrors.student = "Student is required.";
    if (!item) tempErrors.item = "Item is required.";
    if (!quantity || quantity <= 0)
      tempErrors.quantity = "Quantity must be greater than 0.";
    if (item.selectedVariations.length > 0 && variation.length === 0)
      tempErrors.variation = "Variation is required.";
    if (item.selectedSizes.length > 0 && size.length === 0)
      tempErrors.size = "Size is required.";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0; // Returns true if no errors
  };

  const createOrderHandler = () => {
    if (!validateForm()) return;

    setIsLoading(true);

    const items = {
      product_id: item._id,
      imageUrl1: item.imageUrl[0],
      product_name: item.name,
      limited: item.control === "limited-purchase",
      price: finalPrice ? finalPrice : item.price,
      quantity,
      sub_total: finalPrice, // now discounted
      variation: variation,
      sizes: size,
      batch: item.batch,
      discount: discount,
    };

    const formData = {
      id_number: student.id_number,
      rfid: student.rfid,
      imageUrl1: item.imageUrl[0],
      membership_discount: false,
      course: student.course,
      year: student.year,
      student_name: `${student.first_name} ${student.middle_name} ${student.last_name}`,
      items,
      total: finalPrice, // total after discount
      admin: user.id_number,
      order_date: new Date(),
      order_status: "Pending",
    };

    onCreateOrder(formData);
  };

  return (
    <Modal onClose={handleClose}>
      <div className="flex flex-col gap-2 p-4 h-full max-h-[80vh] overflow-y-auto">
        <h1 className="text-2xl font-semibold"> Add Order </h1>

        <SearchDropdown
          label="Student"
          placeholder="Search ID Number..."
          options={studentOptions}
          onOptionSelect={(opt) => {
            setStudent(opt ? opt.value : null);
            setErrors({ ...errors, student: "" });
          }}
        />
        {errors.student && (
          <p className="text-red-500 text-sm">{errors.student}</p>
        )}

        <SearchDropdown
          label="Item"
          placeholder="Search Item Name..."
          options={merchOptions}
          onOptionSelect={(opt) => {
            setItem(opt ? opt.value : null);
            setErrors({ ...errors, item: "" });
          }}
        />
        {errors.item && <p className="text-red-500 text-sm">{errors.item}</p>}

        <TextInput
          label="Quantity"
          type="number"
          value={quantity}
          placeholder="Qty"
          onChange={(e) => {
            const qty = parseInt(e.target.value) || 1;
            setQuantity(qty);
            setErrors({ ...errors, quantity: "" });
          }}
        />
        {errors.quantity && (
          <p className="text-red-500 text-sm">{errors.quantity}</p>
        )}

        <TextInput
          label="Amount"
          type="number"
          value={amount}
          placeholder="Price"
        />

        <TextInput
          label="Discount (%)"
          type="number"
          value={discount}
          placeholder="Enter discount %"
          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
        />

        <TextInput
          label="Final Price (After Discount)"
          type="number"
          value={finalPrice}
          placeholder="Final Price"
          readOnly
        />

        <TextInput
          label="Discount (%)"
          type="number"
          value={discount}
          placeholder="Enter discount %"
          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
        />

        <TextInput
          label="Final Price (After Discount)"
          type="number"
          value={finalPrice}
          placeholder="Final Price"
          readOnly
        />

        {item &&
        (item.type === "Uniform" ||
          item.type === "Tshirt" ||
          item.type === "Tshirt w/ Bundle") ? (
          <div>
            <p className="font-semibold">Select Size:</p>
            <div className="flex gap-2 flex-wrap">
              {item.selectedSizes &&
                Object.keys(item.selectedSizes).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`p-2 border rounded ${
                      size === s
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {s}
                  </button>
                ))}
            </div>

            {errors.size && (
              <p className="text-red-500 text-sm">{errors.size}</p>
            )}
            <p className="font-semibold">Variations:</p>
            <div className="flex gap-2 flex-wrap text-sm">
              {item.selectedVariations.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariation(v)}
                  className={`p-2 border rounded ${
                    variation === v
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {errors.variation && (
              <p className="text-red-500 text-sm">{errors.variation}</p>
            )}
          </div>
        ) : null}

        <Button
          size="full"
          onClick={createOrderHandler}
          disabled={isLoading || !student || !item || quantity <= 0}
          className={`${
            isLoading || !student || !item || quantity <= 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <TailSpin
                visible={true}
                height="20"
                width="20"
                color="#ffffff"
                ariaLabel="tail-spin-loading"
              />
              <span className="ml-2">Loading...</span>
            </div>
          ) : !student || !item || quantity <= 0 ? (
            "Add Details Before Submitting"
          ) : (
            "Create Order"
          )}
        </Button>
      </div>
    </Modal>
  );
};

AddOrderModal.propTypes = {
  handleClose: PropTypes.func,
  studentOptions: PropTypes.array,
  merchOptions: PropTypes.array,
  setSelectedStudent: PropTypes.func,
  setSelectedItem: PropTypes.func,
  selectedItem: PropTypes.object,
  onCreateOrder: PropTypes.func.isRequired,
};

export default AddOrderModal;