import { Router } from "express";
import {
  getSpecificOrdersController,
  getAllOrdersController,
  getAllPendingOrdersController,
  getAllPaidOrdersController,
  cancelOrderController,
  approveOrderController,
  getAllPendingCountController,
} from "../controllers/order.controller";
import { orderController as orderV2Controller } from "../controllers/order.v2.controller";
import {
  requireAccessTokenV2,
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
  requireActiveStudentMembershipV2,
} from "../middlewares/authV2.middleware";
import { psits_roles } from "../enums/role.enums";
const router = Router();

//Get specific order via id_number
router.get(
  "/",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin", "student"]),
  getSpecificOrdersController
);
//Get all orders
router.get(
  "/get-all-orders",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getAllOrdersController
);

//orders/get-all-paid-orders
//get all pending orders
router.get(
  "/get-all-pending-orders",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getAllPendingOrdersController
);

//Get all paid orders
router.get(
  "/get-all-paid-orders",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getAllPaidOrdersController
);

//Cancel Order
router.put(
  "/cancel/:product_id",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin", "student"]),
  cancelOrderController
);

router.put(
  "/approve-order",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(["admin", "finance"]),
  approveOrderController
);

// orders.js (backend api)
router.get(
  "/get-all-pending-counts",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getAllPendingCountController
);

// ─── V2 Routes ─────────────────────────────────────────────

// Consolidated pending/paid with status param + pagination + search
router.get(
  "/v2/get-all-pending-paid-orders",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  orderV2Controller.getAllPendingPaidOrders
);

// Printable receipt for paid orders (V2)
router.get(
  "/v2/:orderId/receipt",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([
    psits_roles.ADMIN,
    psits_roles.FINANCE,
    psits_roles.HEAD_FINANCE,
  ]),
  orderV2Controller.getOrderReceipt
);

// Cancel order (body: { _id }) — restores stock (V2)
router.put(
  "/v2/cancel",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  orderV2Controller.cancelOrder
);

// Approve order (body: { order_id, cash? }) (V2)
router.put(
  "/v2/approve",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([
    psits_roles.ADMIN,
    psits_roles.FINANCE,
    psits_roles.HEAD_FINANCE,
  ]),
  orderV2Controller.approveOrder
);

// Refund a paid order (V2)
router.post(
  "/v2/refund",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([
    psits_roles.ADMIN,
    psits_roles.FINANCE,
    psits_roles.HEAD_FINANCE,
  ]),
  orderV2Controller.processRefund
);

// Create order (student) — uses V2 service + JWT identity (V2)
router.post(
  "/v2/create",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["student"]),
  requireActiveStudentMembershipV2,
  orderV2Controller.createOrder
);

export default router;
