import { useMemo, useState } from "react";

export type AccountSortValue =
  | "name:asc"
  | "name:desc"
  | "idNumber:asc"
  | "idNumber:desc"
  | "campus:asc"
  | "campus:desc";

export interface AccountListFields {
  name?: string;
  idNumber?: string;
  campus?: string;
  /** Other text the search box should match (position, email, role...). */
  searchable?: Array<string | undefined>;
}

/**
 * Client-side search, campus filter and sort for the Devtools account lists
 * (sessions, officers, suspended officers, pending requests). `getFields`
 * must be defined outside the component so it stays stable between renders.
 */
export const useAccountListFilter = <T>(
  items: T[],
  getFields: (item: T) => AccountListFields
) => {
  const [search, setSearch] = useState("");
  const [campus, setCampus] = useState("all");
  const [sort, setSort] = useState<AccountSortValue>("name:asc");

  const campusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => getFields(item).campus)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [items, getFields]
  );

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const [sortKey, direction] = sort.split(":") as [
      "name" | "idNumber" | "campus",
      "asc" | "desc",
    ];

    return items
      .filter((item) => campus === "all" || getFields(item).campus === campus)
      .filter((item) => {
        if (!query) return true;
        const fields = getFields(item);
        return [fields.name, fields.idNumber, fields.campus, ...(fields.searchable ?? [])]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const left = getFields(a)[sortKey] ?? "";
        const right = getFields(b)[sortKey] ?? "";
        const order = left.localeCompare(right, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        return direction === "asc" ? order : -order;
      });
  }, [items, getFields, search, campus, sort]);

  const isFiltered = search.trim() !== "" || campus !== "all";

  return {
    search,
    setSearch,
    campus,
    setCampus,
    sort,
    setSort,
    campusOptions,
    visibleItems,
    isFiltered,
  };
};
