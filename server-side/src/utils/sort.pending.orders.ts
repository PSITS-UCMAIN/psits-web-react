export interface ISort {
  field: string;
  direction: string;
}
export const orderSort = (
  resultArray: { product_name: string; total: number; yearCounts: number[] }[],
  sort: ISort[]
) => {
  if (!resultArray || !sort || sort.length === 0) {
    return resultArray;
  }

  const sortedArray = [...resultArray];

  sortedArray.sort((a, b) => {
    for (const sortItem of sort) {
      const { field, direction } = sortItem;
      let compareResult = 0;

      if (field === "product_name") {
        compareResult = a.product_name.localeCompare(b.product_name);
      } else if (field === "total") {
        compareResult = a.total - b.total;
      } else if (field === "yearCounts") {
        compareResult = a.yearCounts[0] - b.yearCounts[0];
      } else if (field.startsWith("year_")) {
        // Example: field = "year_1" for first year, "year_2" for second year
        const yearIndex = parseInt(field.split("_")[1], 10) - 1;
        compareResult = a.yearCounts[yearIndex] - b.yearCounts[yearIndex];
      }

      if (direction === "desc") {
        compareResult = -compareResult;
      }

      if (compareResult !== 0) {
        return compareResult;
      }
    }

    return 0;
  });

  return sortedArray;
};
