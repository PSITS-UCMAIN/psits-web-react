// utils/searchPendingOrders.js

import { IOrdersDocument } from "../models/orders.model";

export const orderSearch = (orders: IOrdersDocument[], searchQuery: any) => {
  if (!searchQuery) return orders;

  const filtered = orders.filter((order) =>
    order.items.some(
      (item) =>
        item.product_name &&
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return filtered;
};
