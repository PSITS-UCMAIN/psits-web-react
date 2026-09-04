import { Student } from "../models/student.model";
import { Event } from "../models/event.model";
import { CartItem } from "../models/cart.model";
import { Orders, IOrdersDocument } from "../models/orders.model";
import { Merch } from "../models/merch.model";
import { Admin } from "../models/admin.model";
import { IOrders } from "../models/orders.interface";
import { IOrderReceipt } from "../mail_template/mail.interface";
import { orderSearch } from "../utils/search.pending.orders";
import { orderSort, ISort } from "../utils/sort.pending.orders";
import { Promo } from "../models/promo.model";
import { PromoUsage } from "../models/promo.usage.model";
//Initialize
import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
import { format } from "date-fns";
import {
  formatReceiptDateTime,
  orderReceipt,
} from "../mail_template/mail.template";
import { Request, Response } from "express";
import { Refund } from "../models/refund.model";
import { refundCodeGenerator } from "../custom_function/code_generator";
import { orderService } from "../services/order.service";
import { adminService } from "../services/admin.service";
import { logService } from "../services/log.service";
import { logs_action } from "../enums/logs.enums";
import { AppError } from "../util/app.error.util";
import { catchAsync } from "../util/catch.async.util";
import { studentService } from "../services/student.service";
import { promoService } from "../services/promo.service";
import { reportService } from "../services/report.service";
import { refundService } from "../services/refund.service";
import { merchandiseService } from "../services/merchandise.service";
import { IStudent } from "../models/student.interface";
import {
  IOrderProcessingResult,
  IOrderFinalizationResult,
} from "../services/order.service.inteface";
import { IOrderPromoEligibility } from "../services/promo.service.interface";
import { IAdmin } from "../models/admin.interface";

class OrderController {
  //Specific Order using id number
  getSpecificOrder = catchAsync(async (req: Request, res: Response) => {
    const { id_number } = req.query;
    const result = await orderService.getSpecificOrderDynamic({ id_number });

    return res.status(200).json({
      message: "Successfully retrieved specific order",
      data: result,
    });
  });
  //Get all orders
  getAllOrders = catchAsync(async (req: Request, res: Response) => {
    const orders = await orderService.getAllOrders({});
    return res.status(200).json({
      message: "Successfully retrieved all orders",
      data: orders,
    });
  });
  //Get all pending / paid orders with params
  /*
  Structure in frontend for sending this request:
  params:{
    query.limit: number,
    query.search: string,
    query.page: number,
    status: Paid | Pending,

  }

  */
  getAllPendingPaidOrders = catchAsync(async (req: Request, res: Response) => {
    const result = await orderService.getAllOrdersDynamicStatus({
      query: req.query,
      status: (req.query.status as string) || "Pending",
    });

    return res.status(200).json({
      message: "Successfully retrieved pending and paid orders",
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  getOrderReceipt = catchAsync(async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || "");
    const receipt = await orderService.getPrintableOrderReceipt(orderId);

    return res.status(200).json({
      message: "Successfully retrieved order receipt",
      data: receipt,
    });
  });
  //Create Order Controller
  //Create Order
  /*
  The previous logic is we have dynamic order process where in students and admin can order, thus the req.both is where who is processing the order

  if it is the student then we will get it. or an admin


  so I will add a parameter of requestor.
  The requestor is coming from the authorization handler 

  the params are
  1. promo_id = if ever naa
  2. items [order items]
  3. admin (if ever naa)

  then requestor

  this create order doesnt minus the stock of the items, it will just create the order and then the admin will approve it and then it will minus the stock of the items

  */
  createOrder = catchAsync(async (req: Request, res: Response) => {
    const { promo_id, items } = req.body;
    const user = req.userV2;
    //Check user availability
    const student = await studentService.getSpecific({
      id_number: user.idNumber,
    });
    if (!student) {
      throw new AppError("No student found!", 404);
    }
    //Start to do transaction case in database
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {
      //Process Order
      const processOrder: IOrderProcessingResult =
        await orderService.orderProcessingService(items, session);

      //Promo Code Validation
      const validation: IOrderPromoEligibility =
        await promoService.verifyOrderPromoEligibility(
          promo_id,
          student,
          processOrder.orderItems
        );
      //Promo Code Discount Calculation
      const total =
        validation.promoDiscount.discount === 0
          ? processOrder.orderTotal
          : orderService.processDiscountAmount(
              processOrder.orderTotal,
              validation.promoDiscount.discount
            );
      //Process final Order
      const finalOrder: IOrderFinalizationResult =
        orderService.processFinalOrder(
          student,
          validation,
          processOrder,
          total
        );
      const newOrder = new Orders(finalOrder);
      await newOrder.save({ session });

      // Create PromoUsage records and decrement quantity if promo was used
      if (promo_id && validation.promoDiscount.discount > 0) {
        const orderId = newOrder._id as Types.ObjectId;
        const eligibleItems = processOrder.orderItems.filter((item: any) => {
          const matchesMerch = promoService.verifyMerchPromo(
            validation.promo,
            String(item.product_id)
          );
          if (matchesMerch) return true;
          if (
            validation.promo.promo_scope !== "merchandise" &&
            Array.isArray(validation.promo.selected_categories)
          ) {
            const itemCategory = (item as any).category;
            if (itemCategory) {
              return validation.promo.selected_categories.some(
                (cat: string) =>
                  cat.toLowerCase() === itemCategory.toLowerCase()
              );
            }
          }
          return false;
        });

        if (eligibleItems.length > 0) {
          const promoUsageRecords = eligibleItems.map((item: any) => ({
            promo_id: new Types.ObjectId(promo_id),
            order_id: orderId,
            merch_id: new Types.ObjectId(String(item.product_id)),
            id_number: student.id_number,
            promo_used: new Date(),
          }));
          await PromoUsage.create(promoUsageRecords, { session });

          if (validation.promo.limit_type === "Limited") {
            await Promo.findByIdAndUpdate(
              new Types.ObjectId(promo_id),
              { $inc: { quantity: -1 } },
              { session }
            );
          }
        }
      }

      //Commit Transaction
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: "Successfully created order",
      });
    } catch (err) {
      // Only abort/end the session if the transaction is still active.
      // If the failure happened after commitTransaction()/endSession()
      // (e.g. during order processing), calling abort/end again
      // would throw and crash the server.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      if (session.transaction) {
        session.endSession();
      }
      throw err instanceof AppError
        ? err
        : new AppError("Failed to create order", 500);
    }
  });

  /*
    To cancel an order, the admin will just need to provide the order id and then the system will check if the order is already approved or not, if it is already approved then the system will not allow to cancel the order, if it is still pending then the system will cancel the order and then return a message that the order is cancelled
  
  */
  cancelOrder = catchAsync(async (req: Request, res: Response) => {
    const { _id } = req.body;
    const session = await mongoose.startSession();
    await session.startTransaction();
    try {
      const result = await orderService.cancelOrderWithStockRestore(
        _id,
        session
      );
      await session.commitTransaction();
      session.endSession();
      //Log outside of transaction - wrap in try-catch so a log failure
      //does not trigger the catch block below (which would try to abort
      //an already-committed session).
      try {
        await logService.create({
          admin: req.admin?.name ?? "Unknown Admin",
          admin_id: req.admin?._id,
          action: logs_action.CANCEL_ORDER,
          target: typeof _id === "string" ? _id : undefined,
          target_id: Types.ObjectId.isValid(String(_id))
            ? new Types.ObjectId(String(_id))
            : undefined,
          target_model: "Order",
        });
      } catch (logErr) {
        console.error("Failed to create cancel order log:", logErr);
      }
      return res.status(200).json({
        message: result.message,
      });
    } catch {
      // Only abort/end the session if the transaction is still active.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      if (session.transaction) {
        session.endSession();
      }
      throw new AppError("Failed to cancel order", 500);
    }
  });
  /*
    To approve an order, the admin will just need to provide the order id and then the system will check if the order is already approved or not, if it is already approved then the system will not allow to approve the order, if it is still pending then the system will approve the order and then return a message that the order is approved
  */
  approveOrder = catchAsync(async (req: Request, res: Response) => {
    const { order_id, cash } = req.body;
    const user = req.userV2;

    const admin = await adminService.retrieveSpecific(user.idNumber);

    if (!admin) {
      throw new AppError("Admin not found", 404);
    }

    const checkOrder = await orderService.checkOrderApproveStatus(order_id);
    if (checkOrder.status) {
      return res.status(400).json({
        message: checkOrder.message,
      });
    }

    //Start session
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {
      //Call for approve order service
      const result: any = await orderService.approveOrderService(
        order_id,
        admin.name,
        cash,
        session
      );
      //Create a Stocks array for bulk update
      const productArray = result.items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));
      //Update the stocks of the products
      await merchandiseService.updateManyStocks(productArray, session);
      //Create a report data array
      const reportDataArray = result.items.map((item: any) => ({
        order_id: order_id,
        id_number: result.id_number,
        merch_id: item.product_id,
        item_count: item.quantity,
        total: item.sub_total,
        date: new Date(),
      }));

      //Store the report data array to reports
      const processReports = await reportService.createReports(
        reportDataArray,
        session
      );
      if (!processReports.success) {
        // Let the catch block below handle the abort/end so we never
        // double-abort or leave the session dangling.
        throw new AppError("Failed to create reports", 500);
      }

      //Create a receipt for the order
      const receipt: any = await orderService.generateOrderReceipt(
        result.order || result,
        admin.name,
        cash
      );
      //Fetch for email
      const userEmail = await studentService.getIdSession(
        result.id_number,
        session
      );

      //End session and commit transaction
      await session.commitTransaction();
      session.endSession();

      // The order is already approved at this point. Send the receipt email
      // and write the audit log in the background instead of making the
      // client wait on them - orderReceipt already handles its own errors.
      if (userEmail?.email) {
        void orderReceipt(
          {
            ...receipt,
            transaction_date: formatReceiptDateTime(receipt.transaction_date),
          },
          userEmail.email,
          userEmail._id.toString(),
          receipt.reference_code
        );
      }
      logService
        .create({
          admin: admin.name,
          admin_id: admin._id,
          action: logs_action.APPROVE_ORDER,
          target: result.order?.reference_code ?? String(order_id),
          target_id: Types.ObjectId.isValid(String(order_id))
            ? new Types.ObjectId(String(order_id))
            : undefined,
          target_model: "Order",
        })
        .catch((logErr) => {
          console.error("Failed to create approve order log:", logErr);
        });

      return res.status(200).json({
        message: userEmail?.email
          ? "Successfully approved order"
          : "Successfully approved order (email not sent - no email on file)",
      });
    } catch (err) {
      // Only abort/end the session if the transaction is still active.
      // If the failure happened after commitTransaction()/endSession()
      // (e.g. email sending or log creation), calling abort/end again
      // would throw and crash the server.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      if (session.transaction) {
        session.endSession();
      }
      throw err instanceof AppError
        ? err
        : new AppError("Failed to approve order", 500);
    }
  });

  //Refund a paid order (V2)
  processRefund = catchAsync(async (req: Request, res: Response) => {
    const { order_id } = req.body;
    const user = req.userV2;

    const admin = await adminService.retrieveSpecific(user.idNumber);
    if (!admin) {
      throw new AppError("Admin not found", 404);
    }

    const session = await mongoose.startSession();
    await session.startTransaction();

    try {
      const result = await refundService.processRefund(
        order_id,
        admin.name,
        user.idNumber,
        session
      );
      await session.commitTransaction();
      session.endSession();
      //Log outside of transaction - wrap in try-catch so a log failure
      //does not trigger the catch block below (which would try to abort
      //an already-committed session).
      try {
        await logService.create({
          admin: admin.name,
          admin_id: admin._id,
          action: logs_action.REFUND_ORDER,
          target: String(order_id),
          target_id: Types.ObjectId.isValid(String(order_id))
            ? new Types.ObjectId(String(order_id))
            : undefined,
          target_model: "Order",
        });
      } catch (logErr) {
        console.error("Failed to create refund order log:", logErr);
      }
      return res.status(200).json({
        message: result.message,
      });
    } catch (err) {
      // Only abort/end the session if the transaction is still active.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      if (session.transaction) {
        session.endSession();
      }
      throw err;
    }
  });
}

export const orderController = new OrderController();
