import React from "react";
import ProductCard from "./ProductCard";
import { InfinitySpin } from "react-loader-spinner";
const ProductList = ({ products, isLoading }) => {
  return (
    <div className="pt-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-60vh">
          <InfinitySpin
            visible={true}
            width={200}
            color="#0d6efd"
            ariaLabel="infinity-spin-loading"
          />
        </div>
      ) : products.length === 0 ? (
        <p className="text-gray-600 text-center mt-4">No products available</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {products.map((product, index) => (
            <ProductCard product={product} key={index} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
