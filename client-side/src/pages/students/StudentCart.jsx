import React, { useState, useEffect, useRef, useCallback } from "react";
import { showToast } from "../../utils/alertHelper";
import { motion, AnimatePresence } from "framer-motion";
import { viewCart, deleteItem } from "../../api/students";
import { makeOrder } from "../../api/orders";
import { getInformationData } from "../../authentication/Authentication";
import { getMembershipStatusStudents } from "../../api/students";
import { formattedDate } from "../../components/tools/clientTools";

const Modal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white p-4 rounded"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          >
            <h2 className="text-lg font-bold">Confirm Deletion</h2>
            <p>Are you sure you want to delete this item?</p>
            <div className="flex space-x-4 mt-4">
              <button
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={onConfirm}
              >
                Delete
              </button>
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const OrderModal = ({ isVisible, total, onClose, items, onConfirm }) => {
  const modalRef = useRef(null);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            ref={modalRef}
            className="bg-white rounded-lg shadow-lg w-full mx-4 max-w-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          >
            {/* Updated Header */}
            <div className="bg-navy text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">Review Your Items</h2>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 font-semibold">
                <span className="flex items-center justify-start">Product</span>
                <span className="flex items-center justify-center">
                  Quantity
                </span>
                <span className="flex items-center justify-end">Price</span>
              </div>
              {items.map((item) => (
                <div
                  key={item._id}
                  className="grid grid-cols-3 gap-4 items-center"
                >
                  <div className="flex items-center space-x-2">
                    <img
                      src={item.imageUrl1}
                      alt={item.product_name}
                      className="w-12 h-12"
                    />
                    <div>
                      <h3 className="text-sm font-medium">
                        {item.product_name}
                      </h3>
                      <p className="text-xs text-gray-500">{`₱${item.price}`}</p>
                    </div>
                  </div>
                  <p className="text-sm text-center">{item.quantity}</p>
                  <p className="text-sm text-right">{`₱${(
                    item.price * item.quantity
                  ).toFixed(2)}`}</p>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-4 font-semibold mt-4">
                <span>Total Price:</span>
                <span></span>
                <span className="text-right">₱{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Updated Footer */}
            <div className="p-4 flex justify-end space-x-4 bg-gray-100 rounded-b-lg border-t">
              <button
                onClick={onClose}
                className="px-5 py-2 text-gray-500 hover:text-gray-700 transition-all focus:outline-none rounded-md border border-gray-300 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="ml-3 px-6 py-2 bg-gradient-to-r bg-navy text-white rounded-md hover:shadow-lg hover:from-primary hover:to-navy focus:outline-none transition-all duration-300 ease-in-out"
              >
                Confirm Order
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const OrderSummary = ({
  subTotal,
  discountedTotal,
  onCheckout,
  totalPrice,
}) => {
  return (
    <motion.div
      className="row-start-2 col-span-full w-full lg:row-start-1 lg:col-start-4 lg:col-span-2 lg:max-w-sm mx-auto p-4 bg-white shadow-lg rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-lg font-semibold mb-3 text-center sm:text-left">
        Order Summary
      </h2>
      <div className="border-t border-gray-200 pt-3">
        <div className="flex justify-between mb-1 text-sm sm:text-base">
          <span className="font-medium">SUB TOTAL</span>
          <span className="font-medium">₱{subTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-1 text-sm sm:text-base">
          <span className="font-medium">Discount</span>
          <span className="text-red-500">-₱{discountedTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-3 border-t border-gray-200 pt-1 text-sm sm:text-base">
          <span className="font-semibold text-base">TOTAL PRICE</span>
          <span className="font-semibold text-base">
            ₱{totalPrice.toFixed(2)}
          </span>
        </div>
      </div>
      <motion.button
        type="button"
        className="mt-4 w-full bg-primary text-white py-2 rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        onClick={onCheckout}
        whileHover={{ scale: 1.05 }}
      >
        Proceed to Checkout
      </motion.button>
    </motion.div>
  );
};

const CartItem = ({
  product,
  onQuantityChange,
  onSelect,
  onCheckboxChange,
}) => {
  const {
    imageUrl1,
    product_id,
    product_name,
    price,
    quantity,
    selected,
    limited,
    sizes,
    variation,
  } = product;
  const [isModalOpen, setModalOpen] = useState(false);
  const user = getInformationData();

  const handleDeleteClick = () => {
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const data = {
      id_number: user.id_number,
      cart_id: product._id,
    };
    await deleteItem(data);
    setModalOpen(false);
  };

  const handleCancelDelete = () => {
    setModalOpen(false);
  };

  const handleItemClick = (e) => {
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") {
      onCheckboxChange(product_id);
    }
  };

  return (
    <div
      className="flex flex-col sm:flex-row items-start p-4 border-b border-gray-200 bg-white shadow-sm rounded-lg mb-4 cursor-pointer"
      onClick={handleItemClick}
    >
      {/* Checkbox */}
      <div
        className="flex-shrink-0 md:self-center flex items-center mb-3 sm:mr-3 sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          id={`checkbox-${product_id}`}
          type="checkbox"
          checked={selected || false}
          onChange={() => onCheckboxChange(product_id)}
          className="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
        />
      </div>
      {/* Product Image */}
      <div className="flex-shrink-0 w-full sm:w-1/4 mb-4 sm:mb-0">
        <img
          src={imageUrl1}
          alt={product_name}
          className="object-cover w-full h-24 sm:h-32 rounded-md"
        />
      </div>
      {/* Product Details */}
      <div className="flex-1 sm:ml-4">
        <h4 className="text-base sm:text-lg font-semibold text-gray-800">
          {product_name}
        </h4>
        {sizes && sizes.length > 0 && (
          <p className="text-sm sm:text-base font-medium text-gray-700">
            Size: {sizes.join(", ")}
          </p>
        )}

        {variation && variation.length > 0 && (
          <p className="text-sm sm:text-base font-medium text-gray-700">
            Color: {variation.join(", ")}
          </p>
        )}

        <p className="text-sm sm:text-base font-medium text-gray-700">
          ₱{price.toFixed(2)}
        </p>
      </div>

      <div className="flex items-center mt-4 sm:mt-0 sm:ml-4 space-x-2 sm:space-x-4">
        <button
          type="button"
          className="bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg p-2 transition duration-150 ease-in-out text-xs sm:text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onQuantityChange(product_id, Math.max(quantity - 1, 1));
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 12h14"
            />
          </svg>
        </button>
        <span className="text-xs sm:text-base font-medium text-gray-800">
          {quantity}
        </span>
        <button
          type="button"
          className="bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg p-2 transition duration-150 ease-in-out text-xs sm:text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onQuantityChange(product_id, quantity + 1);
          }}
          disabled={limited}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 5v14m7-7H5"
            />
          </svg>
        </button>
        <button
          type="button"
          className="ml-0 sm:ml-4 text-red-600 hover:text-red-800 font-medium transition duration-150 ease-in-out text-xs sm:text-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick();
          }}
        >
          Remove
        </button>
      </div>
      {/* Modal for Deletion */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
const StudentCart = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({ membership: "", renew: "" });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const user = getInformationData();

  const fetchProducts = useCallback(async () => {
    try {
      const data = await viewCart(user.id_number);
      if (data && data.length > 0) {
        const currentDate = new Date();

        const filteredProducts = data.filter((item) => {
          return (
            currentDate >= new Date(item.start_date) &&
            currentDate <= new Date(item.end_date)
          );
        });

        setProducts(filteredProducts);
        setLoading(false);
      } else {
        setProducts([]);
        setLoading(false);
      }
    } catch (error) {
      setError(error.message || "Failed to fetch products");
    }
  });

  const fetchStatus = useCallback(async () => {
    try {
      const membershipStatus = await getMembershipStatusStudents(
        user.id_number
      );
      setStatus(membershipStatus);
    } catch (error) {
      setError(error.message || "Failed to fetch membership status");
    }
  });
  useEffect(() => {
    fetchProducts();
    fetchStatus();
  }, []);

  const statusVerify = () => {
    return (
      (status.membership === "Accepted" && status.renew === "None") ||
      status.renew === "Accepted" ||
      (status.membership === "Accepted" && status.renew !== "Pending")
    );
  };

  const handleQuantityChange = (id, newQuantity) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.product_id === id
          ? { ...product, quantity: newQuantity }
          : product
      )
    );
  };

  const handleCheckout = () => {
    if (products.length === 0) {
      showToast(
        "error",
        "Your cart is empty. Please add items to the cart before proceeding."
      );
      return;
    }

    const selectedItems = products.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      showToast(
        "error",
        "Please select at least one item to proceed with checkout."
      );
      return;
    }

    setShowModal(true);
    setFormData({
      id_number: user.id_number,
      rfid: user.rfid,
      course: user.course,
      year: user.year,
      student_name: user.name,
      items: selectedItems,
      membership_discount: statusVerify(),
      total: calculateTotals().totalPrice,
      order_date: new Date(),
      order_status: "Pending",
    });
  };

  const confirmOrder = async () => {
    setLoading(true);
    try {
      const result = await makeOrder(formData);
      if (result) {
        showToast("success", "Order Placed");
      } else {
        showToast("error", "Order wasn't placed");
      }
    } catch (error) {
      showToast("error", "Order failed due to an error");
    } finally {
      setLoading(false);
      setShowModal(false);
    }
    fetchProducts();
    fetchStatus();
  };

  const handleRemove = (id) => {
    setProducts((prevProducts) =>
      prevProducts.filter((product) => product.product_id !== id)
    );
  };

  const handleCheckboxChange = (id) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.product_id === id
          ? { ...product, selected: !product.selected }
          : product
      )
    );
  };

  const calculateTotals = () => {
    const selectedProducts = products.filter((product) => product.selected);

    const merchandiseSubtotal = selectedProducts
      .filter((item) => item.category === "merchandise")
      .reduce((acc, item) => acc + item.price * item.quantity, 0);

    const nonMerchandiseSubtotal = selectedProducts
      .filter((item) => item.category !== "merchandise")
      .reduce((acc, item) => acc + item.price * item.quantity, 0);

    const discount = statusVerify() ? merchandiseSubtotal * 0.05 : 0;
    const subTotal = merchandiseSubtotal + nonMerchandiseSubtotal;
    const discountedTotal = merchandiseSubtotal - discount;
    const totalPrice = discountedTotal + nonMerchandiseSubtotal;

    return { subTotal, discountedTotal, discount, totalPrice };
  };

  const { subTotal, discountedTotal, discount, totalPrice } = calculateTotals();

  if (error) {
    return <div>Error: {error}</div>;
  }

  return loading ? (
    <div className="flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  ) : (
    <div className="grid min-h-main-md grid-rows-[1fr_auto] grid-cols-3 xl:grid-cols-4 lg:grid-rows-2 lg:flex-row items-start gap-4 pb-4">
      <div className="relative row-start-1 col-span-full lg:col-span-3 lg:row-span-2 h-full bg-white">
        <div className="absolute inset-0 overflow-y-auto p-4">
          {products.length === 0 ? (
            <p className="text-center text-gray-700">Your cart is empty.</p>
          ) : (
            products.map((product) => (
              <CartItem
                key={product.product_id}
                product={product}
                onQuantityChange={handleQuantityChange}
                onSelect={handleRemove}
                onCheckboxChange={handleCheckboxChange}
              />
            ))
          )}
        </div>
      </div>

      <OrderSummary
        subTotal={subTotal}
        discountedTotal={discount}
        onCheckout={handleCheckout}
        totalPrice={totalPrice}
      />

      <OrderModal
        isVisible={showModal}
        onClose={() => setShowModal(false)}
        items={products.filter((product) => product.selected)}
        total={totalPrice}
        onConfirm={confirmOrder}
      />
    </div>
  );
};

export default StudentCart;
