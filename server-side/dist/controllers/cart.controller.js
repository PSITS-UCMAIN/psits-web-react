"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteItemCartController = exports.viewStudentCartController = exports.addCartController = void 0;
const cart_model_1 = require("../models/cart.model");
const student_model_1 = require("../models/student.model");
const mongoose_1 = __importStar(require("mongoose"));
const addCartController = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    const { id_number, product_id, category, product_name, end_date, start_date, limited, price, quantity, sub_total, variation, sizes, batch, imageUrl1, } = req.body;
    try {
        const student = await student_model_1.Student.findOne({
            id_number,
        }).session(session);
        if (!student) {
            res.status(400).json({ message: "No student found!" });
        }
        const productExists = student?.cart.find((item) => item.product_id.toString() === product_id);
        if (productExists) {
            const existingCart = await cart_model_1.CartItem.findOne({
                _id: productExists._id,
            }).session(session);
            if (existingCart) {
                await cart_model_1.CartItem.updateOne({ _id: productExists._id }, {
                    $set: {
                        quantity: existingCart.quantity + quantity,
                    },
                }).session(session);
                if (student) {
                    const itemIndex = student?.cart.findIndex((item) => item.product_id.toString() === product_id);
                    if (itemIndex !== -1) {
                        student.cart[itemIndex].quantity = existingCart.quantity + quantity;
                        await student.save();
                        await session.commitTransaction();
                        session.endSession();
                        res
                            .status(200)
                            .json({ message: "Added Item into the cart successfully" });
                    }
                }
            }
        }
        else {
            const newCart = new cart_model_1.CartItem({
                product_id,
                product_name,
                price,
                end_date,
                start_date,
                category,
                quantity,
                limited,
                sub_total,
                variation,
                sizes,
                batch,
                imageUrl1,
            });
            await newCart.save();
            if (!student) {
                return res.status(404).json({ message: "Student not found" });
            }
            student.cart.push(newCart);
            await student.save();
            await session.commitTransaction();
            session.endSession();
            res
                .status(200)
                .json({ message: "Added Item into the cart successfully" });
        }
    }
    catch (error) {
        session.abortTransaction();
        session.endSession();
        if (error) {
            res.status(400).json({ message: "Cannot add item in cart" });
        }
        else {
            console.error({ message: "Error saving new cart:", error });
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};
exports.addCartController = addCartController;
const viewStudentCartController = async (req, res) => {
    const { id_number } = req.query;
    try {
        const student = await student_model_1.Student.findOne({
            id_number: id_number,
        });
        if (student) {
            if (student.cart.length > 0)
                res.status(200).json(student.cart);
        }
        else {
            res.status(400).json({ message: "No Records" });
        }
    }
    catch (error) {
        console.error("Error fetching Cart:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.viewStudentCartController = viewStudentCartController;
const deleteItemCartController = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    const { id_number, cart_id } = req.body;
    try {
        const result = await student_model_1.Student.findOneAndUpdate({ id_number: id_number }, { $pull: { cart: { _id: cart_id } } }, { new: true, useFindAndModify: false }).session(session);
        const cartId = new mongoose_1.Types.ObjectId(cart_id);
        const cartResult = await cart_model_1.CartItem.findByIdAndDelete(cartId).session(session);
        if (!result && !cartResult) {
            await session.abortTransaction();
            session.endSession();
            res
                .status(400)
                .json({ message: "Student not found or cart item not found." });
        }
        else {
            await session.commitTransaction();
            session.endSession();
            res.status(200).json({ message: "Cart item deleted successfully." });
        }
    }
    catch (error) {
        console.error("Error deleting cart item:", error);
    }
};
exports.deleteItemCartController = deleteItemCartController;
