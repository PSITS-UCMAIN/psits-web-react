import { Orders } from "../models/orders.model";
import { Merch } from "../models/merch.model";
import { Promo } from "../models/promo.model";
import { PromoUsage } from "../models/promo.usage.model";
import { IOrders } from "../models/orders.interface";
import { startOfDay, endOfDay } from "date-fns";
import { AppError } from "../util/app.error.util";
import mongoose, { Types, ClientSession } from "mongoose";
import { merchandiseService } from "./merchandise.service";
import {
  IUserItems,
  IOrderProcessingResult,
  IOrderFinalizationResult,
} from "./order.service.inteface";
import { studentService } from "./student.service";
import { promoService } from "./promo.service";
import { IStudent } from "../models/student.interface";

//Object Order Service for order related database operations
class OrderService {
  //EscapeRegex for search
  escapeRegex = (text: string) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  };
  //buildOrderQuery for dynamic search
  buildOrderSearchQuery = (search: string) => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      return {};
    }

    const searchRegex = new RegExp(this.escapeRegex(trimmedSearch), "i");

    return {
      $or: [
        { student_name: searchRegex },
        { id_number: searchRegex },
        { rfid: searchRegex },
        { reference_code: searchRegex },
        { "items.product_name": searchRegex },
      ],
    };
  };

  getOrderByIdNumber = async (id_number: string, session?: ClientSession) => {
    if (!id_number) throw new AppError("id_number is required", 400);
    const query = session
      ? Orders.find(
          { id_number },
          {
            _id: 1,
            order_status: 1,
            order_date: 1,
            "items.product_name": 1,
            "items.price": 1,
            "items.quantity": 1,
          }
        ).session(session)
      : Orders.find(
          { id_number },
          {
            _id: 1,
            order_status: 1,
            order_date: 1,
            "items.product_name": 1,
            "items.price": 1,
            "items.quantity": 1,
          }
        );
    const result = await query.sort({ order_date: -1 }).lean();
    if (!result || result.length === 0) {
      throw new AppError("No orders found!", 404);
    }

    return result.map((order) => ({
      order_id: order._id,
      order_status: order.order_status,
      order_date: order.order_date,
      items: order.items?.map(({ product_name, price, quantity }) => ({
        product_name,
        price,
        quantity,
      })),
    }));
  };

  //Pending Order Count
  getPendingCount = async () => {
    return Orders.countDocuments({
      order_status: "Pending",
    });
  };

  //Paid Order Count
  getPaidCount = async () => {
    return Orders.countDocuments({
      order_status: "Paid",
    });
  };

  //Refunded Order Count
  getRefundedCount = async () => {
    return Orders.countDocuments({
      order_status: "Refunded",
    });
  };

  //Admin Daily Sales
  getDailySales = async () => {
    const currentDate = new Date();
    const startOfDayDate = startOfDay(currentDate);
    const endOfDayDate = endOfDay(currentDate);

    const result: IOrders[] = await Orders.aggregate([
      {
        $match: {
          transaction_date: {
            $gte: startOfDayDate,
            $lte: endOfDayDate,
          },
          order_status: "Paid",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_name",
          totalQuantity: { $sum: "$items.quantity" },
          totalSubtotal: { $sum: "$items.sub_total" },
        },
      },
      {
        $project: {
          product_name: "$_id",
          totalQuantity: 1,
          totalSubtotal: 1,
          _id: 0,
        },
      },
    ]);
    if (!result) {
      throw new AppError("No orders!", 404);
    }
    return result;
  };
  //Update inside the order with dynamic $set of query
  updateOneDynamic = async (first_params: any, second_params: any) => {
    const result = await Orders.updateOne(first_params, {
      $set: second_params,
    });

    if (result.matchedCount === 0) {
      throw new AppError("No orders updated!", 404);
    }

    if (result.modifiedCount === 0) {
      return { status: true, message: "No changes made" };
    }

    return { status: true, message: "Orders updated successfully" };
  };

  //Get Specific Order with params
  //id_number,reference_code,transaction_date,order_status
  getSpecificOrderDynamic = async (params: any) => {
    const result = await Orders.find(params).sort({ order_date: -1 }).lean();
    if (!result) {
      throw new AppError("No orders found!", 404);
    }
    return result;
  };
  //Get all orders with params, excluding refunded orders
  getAllOrders = async (params: any = {}) => {
    const result = await Orders.find({
      ...params,
      order_status: { $ne: "Refunded" },
    })
      .sort({ order_date: -1 })
      .lean();
    if (!result) {
      throw new AppError("No orders found!", 404);
    }
    return result;
  };

  //Get all pending / paid orders
  //With search and pagination
  //Get all orders with dynamic status, search, and pagination
  getAllOrdersDynamicStatus = async (params: any) => {
    const page = Math.max(parseInt(params.query.page as string, 10) || 1, 1);
    const limit = Math.max(parseInt(params.query.limit as string, 10) || 50, 1);
    const search = (params.query.search as string) || "";
    const trimmedSearch = search.trim();
    const status = params.status;

    const statusLower = status.toLowerCase();
    const total =
      statusLower === "paid"
        ? await this.getPaidCount()
        : statusLower === "refunded"
          ? await this.getRefundedCount()
          : await this.getPendingCount();
    const result = await Orders.find({
      order_status: status,
      ...this.buildOrderSearchQuery(trimmedSearch),
    })
      .sort(
        statusLower === "paid" ? { transaction_date: -1 } : { order_date: -1 }
      )
      .skip((page - 1) * limit)
      .limit(limit);
    return {
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };

  getOrdersByStatus = async (params: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const status = params.status?.trim();
    const page = Math.max(parseInt(String(params.page ?? 1), 10) || 1, 1);
    const limit = Math.max(parseInt(String(params.limit ?? 10), 10) || 1, 1);

    let query: Record<string, unknown> = {};
    if (status) {
      query.order_status = status;
    }

    let total: number;
    if (!status) {
      total = await Orders.countDocuments(query);
    } else {
      const sl = status.toLowerCase();
      if (sl === "pending") total = await this.getPendingCount();
      else if (sl === "paid") total = await this.getPaidCount();
      else if (sl === "refunded") total = await this.getRefundedCount();
      else total = await Orders.countDocuments(query);
    }

    const result = await Orders.find(query)
      .sort(
        status?.toLowerCase() === "paid"
          ? { transaction_date: -1 }
          : { order_date: -1 }
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: result,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      pendingCount: status !== "Pending" ? await this.getPendingCount() : total,
      paidCount: status !== "Paid" ? await this.getPaidCount() : total,
    };
  };

  //This service will process the order and return the orders subtotal and total
  orderProcessingService = async (
    items: IUserItems[],
    session: ClientSession
  ) => {
    let orderTotal = 0;
    let orderItems: IUserItems[] = [];

    const itemsArray = Array.isArray(items) ? items : [items];
    // Check if itemsArray is empty
    if (!itemsArray || itemsArray.length === 0) {
      throw new AppError("No items to process!", 400);
    }
    // Process each item in the order
    for (let item of itemsArray) {
      const productId = new Types.ObjectId(item.product_id);

      //Find Merch in item array
      const findMerch = await merchandiseService.checkExist(productId);
      if (!findMerch.data) {
        throw new AppError("Could not find Merchandise", 404);
      }
      //Check if merchandise is available, an expired sale period is reported
      //separately so the buyer knows why the item was rejected
      if (!findMerch.status) {
        throw new AppError(
          findMerch.reason === "expired"
            ? "This product's sale period has ended"
            : "Merchandise is not available",
          400
        );
      }
      //Check sufficient stocks if it is applicable for deduction, it does not less than 0
      const checkStocks = merchandiseService.checkSufficientStocks(
        findMerch.data.stocks,
        item.quantity
      );
      if (!checkStocks) {
        throw new AppError("Insufficient stocks to deduct!", 404);
      }

      //Actual price
      let actualPrice = findMerch.data?.price;
      if (
        item.sizes &&
        item.sizes.length > 0 &&
        findMerch.data?.selectedSizes
      ) {
        const selectedSize = Array.isArray(item.sizes)
          ? item.sizes[0]
          : item.sizes;
        const sizeConfig = findMerch.data.selectedSizes.get(selectedSize);
        const sizePrice = Number(sizeConfig?.price);
        if (sizeConfig?.custom && Number.isFinite(sizePrice)) {
          actualPrice = sizePrice;
        }
      }
      //Process for subtotal
      let itemSubTotal = actualPrice * item.quantity;
      //Process Order total
      orderTotal += itemSubTotal;

      //This will be the process
      const firstImage = findMerch.data?.imageUrl?.[0];
      const processedItem: IUserItems = {
        product_id: item.product_id,
        imageUrl1: firstImage ? String(firstImage) : item.imageUrl1,
        product_name: findMerch.data?.name,
        limited: findMerch.data?.control === "limited-purchase",
        price: actualPrice,
        discount: item.discount || 0, // keep record
        quantity: item.quantity,
        sub_total: itemSubTotal,
        variation: item.variation,
        sizes: item.sizes,
        batch: findMerch.data?.batch,
        category: findMerch.data?.category,
      };

      //Push into the array
      orderItems.push(processedItem);
    }

    //Return process items
    return { orderItems, orderTotal };
  };

  //Process Final Order
  processFinalOrder = (
    user: IStudent,
    validation: any,
    processOrder: IOrderProcessingResult,
    total: number
  ): IOrderFinalizationResult => {
    const finalOrder: IOrderFinalizationResult = {
      id_number: user.id_number,
      promo: {
        _id: validation.promo._id,
        promo_name: validation.promo.promo_name,
        promo_discount: validation.promo.promo_discount,
      },
      course: user.course,
      year: user.year,
      student_name: studentService.fullNameFormat(user),
      items: processOrder.orderItems,
      total: total,
      order_date: new Date(),
      order_status: "Pending",
      role: user.role,
    };
    return finalOrder;
  };
  //Process discount amount total
  processDiscountAmount = (
    subTotal: number,
    discountPercent: number
  ): number => {
    const discountAmount = subTotal * (discountPercent / 100);
    return subTotal - discountAmount;
  };
  //Cancel Order Service
  cancelOrderService = async (_id: Types.ObjectId) => {
    const result = await Orders.findByIdAndDelete(_id);
    if (!result) {
      throw new AppError("Order not found!", 404);
    }

    return {
      message: "Order cancelled successfully",
    };
  };

  //Cancel Order Service with stock restore (V2 - full refund)
  cancelOrderWithStockRestore = async (
    _id: Types.ObjectId,
    session: ClientSession
  ) => {
    const order = await Orders.findById(_id).session(session);
    if (!order) {
      throw new AppError("Order not found!", 404);
    }

    // Restore promo usage records and quantity if order used a promo
    if (order.promo && order.promo.promo_discount) {
      const promoId = order.promo._id;
      if (promoId) {
        const promoUsageRecords = await PromoUsage.find({
          order_id: _id,
        }).session(session);

        for (const record of promoUsageRecords) {
          await PromoUsage.deleteOne({ _id: record._id }).session(session);
        }

        await Promo.findByIdAndUpdate(
          new Types.ObjectId(promoId),
          { $inc: { quantity: 1 } },
          { session }
        );
      }
    }

    // Restore stock for each item
    for (const item of order.items) {
      await merchandiseService.restoreStocks(
        item.product_id,
        item.quantity,
        session
      );
    }

    // Delete the order
    await Orders.findByIdAndDelete(_id, { session });

    return {
      message: "Order cancelled successfully. Stock restored.",
    };
  };
  //Approve Order Service
  approveOrderService = async (
    _id: Types.ObjectId,
    admin: string,
    cash: number | undefined,
    session: ClientSession
  ) => {
    const result = await Orders.findById(_id).session(session);
    if (!result) {
      throw new AppError("Order not found!", 404);
    }

    const cashAmount = Number(cash);
    const resolvedCash =
      Number.isFinite(cashAmount) && cashAmount >= 0
        ? cashAmount
        : result.total;

    if (resolvedCash < result.total) {
      throw new AppError("Cash cannot be lower than order total", 400);
    }

    result.order_status = "Paid";
    result.reference_code = this.generateReferenceCode();
    result.transaction_date = new Date();
    result.admin = admin;
    result.cash = resolvedCash;
    await result.save({ session });

    return {
      status: true,
      items: result.items,
      id_number: result.id_number,
      order: result,
    };
  };
  //Generate Reference Code Service
  generateReferenceCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomString = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    return `${timestamp}-${randomString}`;
  };
  //Generate Order Receipt Service
  generateOrderReceipt = async (
    order: IOrders,
    admin: string,
    cash: number
  ) => {
    const cashAmount = Number(cash);
    const resolvedCash =
      Number.isFinite(cashAmount) && cashAmount >= 0 ? cashAmount : order.total;
    const receipt = {
      reference_code: order.reference_code,
      order_date: order.order_date,
      transaction_date: order.transaction_date,
      student_name: order.student_name,
      id_number: order.id_number,
      course: order.course,
      year: order.year,
      admin,
      items: order.items.map((item) => ({
        product_name: item.product_name,
        batch: item.batch,
        sizes: item.sizes,
        variation: item.variation,
        quantity: item.quantity,
        price: item.price,
        sub_total: item.sub_total,
      })),
      cash: resolvedCash,
      change: resolvedCash - order.total,
      total: order.total,
      membership_discount: order.membership_discount,
      promo_name: order.promo?.promo_name,
    };
    return receipt;
  };

  getPrintableOrderReceipt = async (orderId: string) => {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new AppError("Invalid order ID", 400);
    }

    const order = await Orders.findById(orderId).lean();
    if (!order) {
      throw new AppError("Order not found!", 404);
    }
    if (order.order_status !== "Paid") {
      throw new AppError("Only paid orders can be printed", 400);
    }

    return this.generateOrderReceipt(
      order as IOrders,
      order.admin || "N/A",
      order.cash ?? order.total
    );
  };
  //Check if order is approved or not
  checkOrderApproveStatus = async (_id: Types.ObjectId) => {
    const result = await Orders.findById(_id);
    if (!result) {
      throw new AppError("Order not found!", 404);
    }
    if (result.order_status === "Paid") {
      return { status: true, message: "Order is already approved" };
    }
    return { status: false, message: "Order is not approved" };
  };
  //Check if order is Paid before refunding
  checkOrderPaidStatus = async (_id: Types.ObjectId) => {
    const result = await Orders.findById(_id);
    if (!result) {
      throw new AppError("Order not found!", 404);
    }
    if (result.order_status !== "Paid") {
      return { result, status: false, message: "Order is not paid" };
    }
    return { result, status: true, message: "Order is paid" };
  };

  getExpiredPendingOrders = async () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return await Orders.find({
      order_status: "Pending",
      order_date: { $lt: oneMonthAgo },
    }).sort({ order_date: 1 });
  };

  cancelExpiredOrders = async () => {
    const expired = await this.getExpiredPendingOrders();
    let cancelledCount = 0;
    let restoredItems = 0;

    for (const order of expired) {
      for (const item of order.items) {
        await Merch.updateOne(
          { _id: item.product_id },
          { $inc: { stocks: item.quantity } }
        );
        restoredItems += item.quantity;
      }
      await Orders.findByIdAndDelete(order._id);
      cancelledCount++;
    }

    return { cancelledCount, restoredItems };
  };
}

export const orderService = new OrderService();
