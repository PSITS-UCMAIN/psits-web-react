export const capitalizeFirstLetter = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatDate = (dateString) => {
  if (typeof dateString !== "string") {
    throw new Error("Invalid date string. Please provide a valid date string.");
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(
      "Invalid date format. Please provide a valid ISO date string."
    );
  }

  const options = { year: "numeric", month: "long", day: "2-digit" };
  return date.toLocaleDateString("en-US", options);
};
