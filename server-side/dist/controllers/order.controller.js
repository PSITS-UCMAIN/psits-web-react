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
exports.getAllPendingCountController = exports.approveOrderController = exports.cancelOrderController = exports.studentAndAdminOrderController = exports.getAllPaidOrdersController = exports.getAllPendingOrdersController = exports.getAllOrdersController = exports.getSpecificOrdersController = void 0;
const student_model_1 = require("../models/student.model");
const event_model_1 = require("../models/event.model");
const cart_model_1 = require("../models/cart.model");
const orders_model_1 = require("../models/orders.model");
const merch_model_1 = require("../models/merch.model");
const log_model_1 = require("../models/log.model");
const admin_model_1 = require("../models/admin.model");
const search_pending_orders_1 = require("../utils/search.pending.orders");
const sort_pending_orders_1 = require("../utils/sort.pending.orders");
//Initialize
const mongoose_1 = __importStar(require("mongoose"));
const date_fns_1 = require("date-fns");
const mail_template_1 = require("../mail_template/mail.template");
const getSpecificOrdersController = async (req, res) => {
    const { id_number } = req.query;
    try {
        const orders = await orders_model_1.Orders.find({
            id_number: id_number,
        }).sort({ order_date: -1 });
        if (orders.length > 0) {
            res.status(200).json(orders);
        }
        else {
            res.status(400).json({ message: "No Records" });
        }
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getSpecificOrdersController = getSpecificOrdersController;
const getAllOrdersController = async (req, res) => {
    try {
        const orders = await orders_model_1.Orders.find().sort({ order_date: -1 });
        if (orders.length > 0) {
            res.status(200).json(orders);
        }
        else {
            res.status(400).json({ message: "No Records" });
        }
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getAllOrdersController = getAllOrdersController;
const getAllPendingOrdersController = async (req, res) => {
    try {
        const orders = await orders_model_1.Orders.find({
            order_status: "Pending",
        }).sort({
            order_date: -1,
        });
        if (orders.length > 0) {
            res.status(200).json(orders);
        }
        else {
            res.status(400).json({ message: "No Records" });
        }
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getAllPendingOrdersController = getAllPendingOrdersController;
const getAllPaidOrdersController = async (req, res) => {
    try {
        const orders = await orders_model_1.Orders.find({ order_status: "Paid" }).sort({
            transaction_date: -1,
        });
        if (orders.length > 0) {
            res.status(200).json(orders);
        }
        else {
            res.status(400).json({ message: "No Records" });
        }
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getAllPaidOrdersController = getAllPaidOrdersController;
const studentAndAdminOrderController = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    const { id_number, rfid, imageUrl1, membership_discount, course, year, student_name, items, total, order_date, order_status, admin, } = req.body;
    const itemsArray = Array.isArray(items) ? items : [items];
    if (admin) {
        const findAdmin = await admin_model_1.Admin.findOne({ id_number: admin });
        if (findAdmin) {
            await new log_model_1.Log({
                admin: findAdmin.name,
                admin_id: findAdmin._id,
                action: "Make manual Order for [" + student_name + "]",
                target: "Manual Order [" + student_name + "]",
            }).save();
        }
    }
    const student = await student_model_1.Student.findOne({ id_number: id_number }).session(session);
    try {
        if (student) {
            const newOrder = new orders_model_1.Orders({
                id_number,
                rfid,
                imageUrl1,
                membership_discount,
                course,
                year,
                student_name,
                items: itemsArray,
                total,
                order_date,
                order_status,
                role: student.role,
            });
            await newOrder.save();
        }
        const findCart = await student_model_1.Student.findOne({ id_number }).session(session);
        if (!findCart) {
            return res.status(404).json({ message: "Student not found" });
        }
        for (let item of itemsArray) {
            const productId = new mongoose_1.Types.ObjectId(item.product_id);
            const findMerch = await merch_model_1.Merch.findOne({ _id: productId }).session(session);
            if (!findMerch) {
                console.warn(`Merchandise with ID ${productId} not found`);
                continue;
            }
            const newStocks = findMerch.stocks - item.quantity;
            const merchStocks = await merch_model_1.Merch.updateOne({ _id: productId }, { $set: { stocks: newStocks } }).session(session);
            if (merchStocks.modifiedCount === 0) {
                await session.abortTransaction();
                session.endSession();
                console.error(`Could not deduct the stocks for product ID ${productId}`);
            }
            await student_model_1.Student.updateOne({ id_number }, { $pull: { cart: { product_id: productId } } }).session(session);
            await cart_model_1.CartItem.findByIdAndDelete(item._id).session(session);
        }
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: "Order Placed Successfully" });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.studentAndAdminOrderController = studentAndAdminOrderController;
const cancelOrderController = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    const { product_id } = req.params;
    if (!product_id) {
        return res.status(400).json({ message: "Product ID is required" });
    }
    const productId = new mongoose_1.Types.ObjectId(product_id);
    try {
        const order = await orders_model_1.Orders.findById(productId).session(session);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        const targetNames = order.items.map((item) => item.product_name).join(", ");
        for (const item of order.items) {
            const merchId = new mongoose_1.Types.ObjectId(item.product_id);
            const merch = await merch_model_1.Merch.findOne({ _id: merchId }).session(session);
            if (!merch) {
                return res.status(404).json({ message: "Merchandise not found" });
            }
            const newStocks = merch.stocks + item.quantity;
            // ✅ Make sure this uses the session
            await merch_model_1.Merch.updateOne({ _id: merchId }, { $set: { stocks: newStocks } }, { session });
        }
        await orders_model_1.Orders.findByIdAndDelete(productId).session(session);
        if (req.admin) {
            const log = new log_model_1.Log({
                admin: req.admin.name,
                admin_id: req.admin._id,
                action: "Canceled Order",
                target: targetNames,
                target_id: order._id,
                target_model: "Order",
            });
            await log.save({ session });
        }
        await session.commitTransaction();
        res.status(200).json({ message: "Order canceled successfully" });
    }
    catch (error) {
        await session.abortTransaction();
        console.error("Error canceling order:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
    finally {
        session.endSession();
    }
};
exports.cancelOrderController = cancelOrderController;
const approveOrderController = async (req, res) => {
    const { transaction_date, reference_code, order_id, admin, cash } = req.body;
    const runWithRetry = async (fn) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            const session = await mongoose_1.default.startSession();
            try {
                session.startTransaction();
                await fn(session);
                await session.commitTransaction();
                session.endSession();
                return;
            }
            catch (err) {
                await session.abortTransaction();
                session.endSession();
                if (err.errorLabels?.includes("TransientTransactionError") &&
                    attempt < 2) {
                    console.warn(`Retrying transaction (attempt ${attempt + 1})...`);
                    continue;
                }
                throw err;
            }
        }
    };
    try {
        await runWithRetry(async (session) => {
            if (!mongoose_1.Types.ObjectId.isValid(order_id)) {
                throw new Error("Invalid order ID");
            }
            const orderId = new mongoose_1.Types.ObjectId(order_id);
            const successfulOrder = await orders_model_1.Orders.findByIdAndUpdate(orderId, {
                $set: {
                    reference_code: reference_code,
                    order_status: "Paid",
                    admin: admin,
                    transaction_date: transaction_date,
                },
            }, { new: true, session });
            if (!successfulOrder) {
                throw new Error("Order not found");
            }
            const student = await student_model_1.Student.findOne({
                id_number: successfulOrder.id_number,
            }).session(session);
            if (!student) {
                throw new Error("Student not found");
            }
            const { items } = successfulOrder;
            if (Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                    const sizes = Array.isArray(item.sizes) ? item.sizes : [];
                    const variations = Array.isArray(item.variation)
                        ? item.variation
                        : [];
                    const merchId = new mongoose_1.Types.ObjectId(item.product_id);
                    const existMerch = await merch_model_1.Merch.findOne({
                        _id: item.product_id,
                        "order_details.reference_code": reference_code,
                    }).session(session);
                    if (!existMerch) {
                        await merch_model_1.Merch.findByIdAndUpdate(item.product_id, {
                            $push: {
                                order_details: {
                                    reference_code: reference_code,
                                    product_name: item.product_name,
                                    id_number: successfulOrder.id_number,
                                    student_name: successfulOrder.student_name,
                                    rfid: successfulOrder.rfid,
                                    course: successfulOrder.course,
                                    year: successfulOrder.year,
                                    batch: item.batch,
                                    size: sizes,
                                    variation: variations,
                                    quantity: item.quantity,
                                    total: item.sub_total,
                                    order_date: successfulOrder.order_date,
                                    transaction_date: successfulOrder.transaction_date,
                                },
                            },
                            $inc: {
                                "sales_data.unitsSold": item.quantity,
                                "sales_data.totalRevenue": item.sub_total,
                            },
                        }, { session });
                        const merchToGet = await merch_model_1.Merch.findById(item.product_id).session(session);
                        const event = await event_model_1.Event.findOne({ eventId: merchId }).session(session);
                        if (event) {
                            const campusData = event.sales_data.find((s) => s.campus === student.campus);
                            if (!campusData) {
                                throw new Error("Invalid campus");
                            }
                            campusData.unitsSold += 1;
                            campusData.totalRevenue += item.sub_total;
                            event.totalUnitsSold += 1;
                            event.totalRevenueAll += item.sub_total;
                            await event.save({ session });
                            if (merchToGet) {
                                await event_model_1.Event.findOneAndUpdate({
                                    eventId: merchId,
                                    "attendees.id_number": { $ne: successfulOrder.id_number },
                                }, {
                                    $push: {
                                        attendees: {
                                            id_number: successfulOrder.id_number,
                                            name: successfulOrder.student_name,
                                            course: successfulOrder.course,
                                            year: successfulOrder.year,
                                            campus: student.campus,
                                            attendance: {
                                                morning: { attended: false, timestamp: "" },
                                                afternoon: { attended: false, timestamp: "" },
                                                evening: { attended: false, timestamp: "" },
                                            },
                                            shirtSize: sizes.length > 0 ? sizes[0] : null,
                                            shirtPrice: merchToGet?.price || null,
                                        },
                                    },
                                }, { session, upsert: true });
                            }
                        }
                    }
                }
            }
            const data = {
                reference_code: successfulOrder.reference_code,
                transaction_date: (0, date_fns_1.format)(new Date(successfulOrder.transaction_date), "MMMM d, yyyy"),
                student_name: student
                    ? `${student.first_name} ${student.middle_name} ${student.last_name}`
                    : "N/A",
                rfid: successfulOrder.rfid || "N/A",
                course: student.course || "N/A",
                year: student.year || 0,
                admin: admin || "N/A",
                items: successfulOrder.items,
                cash: cash || "N/A",
                total: successfulOrder.total || 0,
            };
            await (0, mail_template_1.orderReceipt)(data, student?.email ?? "noemail@gmail.com");
        });
        return res.status(200).json({
            message: "Order approved. Email may have failed.",
        });
    }
    catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).json({
            message: "An error occurred while approving the order",
            error: error,
        });
    }
};
exports.approveOrderController = approveOrderController;
const getAllPendingCountController = async (req, res) => {
    try {
        const { page = "1", limit = "10", search = "", sort = [{ field: "product_name", direction: "asc" }], } = req.query;
        // Base query for pending orders
        let query = { order_status: "Pending" };
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        let sortParam = [{ field: "product_name", direction: "asc" }];
        try {
            sortParam = JSON.parse(sort);
        }
        catch (err) {
            console.warn("Invalid sort param, using default");
        }
        // Fetch all pending orders
        let pendingOrders = await orders_model_1.Orders.find(query);
        // Apply search if present
        if (search) {
            pendingOrders = (0, search_pending_orders_1.orderSearch)(pendingOrders, search);
        }
        const productCounts = {};
        pendingOrders.forEach((order) => {
            order.items.forEach((item) => {
                const name = item.product_name.trim().toLowerCase(); // normalize product names
                if (!productCounts[name]) {
                    productCounts[name] = {
                        total: 0,
                        yearCounts: [0, 0, 0, 0],
                    };
                }
                // Add to total
                productCounts[name].total += item.quantity;
                // Safely increment by year
                if (order.year && order.year >= 1 && order.year <= 4) {
                    productCounts[name].yearCounts[order.year - 1] += item.quantity;
                }
            });
        });
        // Convert products to array
        let result = Object.entries(productCounts).map(([productName, data]) => ({
            product_name: productName, // keep lowercase or format later
            total: data.total,
            yearCounts: data.yearCounts,
        }));
        // Apply sorting if present
        if (sort) {
            result = (0, sort_pending_orders_1.orderSort)(result, sortParam);
        }
        // Pagination logic
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = pageNum * limitNum;
        const paginatedResult = result.slice(startIndex, endIndex);
        res.status(200).json({
            data: paginatedResult,
            total: result.length,
            page: pageNum.toString(),
            totalPages: Math.ceil(result.length / limitNum),
        });
    }
    catch (error) {
        console.error("Error fetching pending orders:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.getAllPendingCountController = getAllPendingCountController;
