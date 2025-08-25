"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_controller_1 = require("../controllers/cart.controller");
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const router = (0, express_1.Router)();
//Student Add Cart
router.post("/add-cart", custom_authenticate_token_1.student_authenticate, cart_controller_1.addCartController);
//Student View Cart
router.get("/view-cart", custom_authenticate_token_1.student_authenticate, cart_controller_1.viewStudentCartController);
//Student Delete Cart Item
router.put("/delete-item-cart", custom_authenticate_token_1.student_authenticate, cart_controller_1.deleteItemCartController);
exports.default = router;
