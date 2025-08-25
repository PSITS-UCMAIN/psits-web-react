"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const order_controller_1 = require("../controllers/order.controller");
const router = (0, express_1.Router)();
//Get specific order via id_number
router.get("/", custom_authenticate_token_1.both_authenticate, order_controller_1.getSpecificOrdersController);
//Get all orders
router.get("/get-all-orders", custom_authenticate_token_1.admin_authenticate, order_controller_1.getAllOrdersController);
//orders/get-all-paid-orders
//get all pending orders
router.get("/get-all-pending-orders", custom_authenticate_token_1.admin_authenticate, order_controller_1.getAllPendingOrdersController);
//Get all paid orders
router.get("/get-all-paid-orders", custom_authenticate_token_1.admin_authenticate, order_controller_1.getAllPaidOrdersController);
router.post("/student-order", custom_authenticate_token_1.both_authenticate, order_controller_1.studentAndAdminOrderController);
// Cancel Order
router.put("/cancel/:product_id", custom_authenticate_token_1.both_authenticate, order_controller_1.cancelOrderController);
router.put("/approve-order", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), order_controller_1.approveOrderController);
// orders.js (backend api)
router.get("/get-all-pending-counts", custom_authenticate_token_1.admin_authenticate, order_controller_1.getAllPendingCountController);
exports.default = router;
