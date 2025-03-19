import React from "react";

const ImageInput = ({
  label,
  handleImageChange,
  multiple,
  previews,
  onRemoveImage,
  uploadedImages,
  newImages,
  imagePreviews,
  onAddImages,
}) => {
  const handleRemove = (image, index) => {
    onRemoveImage(image, index);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="mt-2 flex flex-wrap mb-2 gap-2">
        {previews.map((preview, index) => (
          <div key={index} className="relative">
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-24 h-24 object-cover rounded-md border border-gray-300"
            />
            <button
              type="button"
              onClick={() => handleRemove(preview, index)}
              className="absolute top-0 right-0 bg-red-500 text-white text-xs p-1 rounded-full"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        name="image_url"
        accept="image/*"
        onChange={handleImageChange}
        className="block w-full text-xs border border-gray-300 rounded-md p-2"
        multiple={multiple}
      />
    </div>
  );
};

export default ImageInput;
