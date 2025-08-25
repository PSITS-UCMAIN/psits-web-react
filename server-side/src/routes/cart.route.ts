import { Router } from "express";
import {
  addCartController,
  viewStudentCartController,
  deleteItemCartController,
} from "../controllers/cart.controller";
import { student_authenticate } from "../middlewares/custom_authenticate_token";
const router = Router();

//Student Add Cart
router.post("/add-cart", student_authenticate, addCartController);
//Student View Cart
router.get("/view-cart", student_authenticate, viewStudentCartController);
//Student Delete Cart Item
router.put("/delete-item-cart", student_authenticate, deleteItemCartController);

export default router;
