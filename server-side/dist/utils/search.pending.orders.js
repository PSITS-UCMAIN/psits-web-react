"use strict";
// utils/searchPendingOrders.js
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderSearch = void 0;
const orderSearch = (orders, searchQuery) => {
    if (!searchQuery)
        return orders;
    const filtered = orders.filter((order) => order.items.some((item) => item.product_name &&
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase())));
    return filtered;
};
exports.orderSearch = orderSearch;
