  import { Merch } from "../models/merch.model";
  import mongoose, { Types, ClientSession } from "mongoose";
  import { IMerch } from "../models/merch.interface";
  import { AppError } from "../util/app.error.util";
  import { IResponseMessage } from "../models/global.response.interface";

  class MerchandiseService {
    //Number of published merchandise, it is used in the admin dashboard
    getPublishCount = async () => {
      const now = new Date();

      const count = await Merch.countDocuments({
        is_active: true,
        start_date: { $lte: now },
        end_date: { $gte: now },
      });
      if (!count) {
        throw new AppError("No items are available", 404);
      }
      return count;
    };
    //Check if product exist and is purchasable, the data is always returned so
    //the caller can report why it was rejected
    checkExist = async (product_id: Types.ObjectId) => {
      const result = await Merch.findById({ _id: product_id });
      if (!result) {
        throw new AppError("Product doesn't exist", 404);
      }

      const reason = this.checkUnavailableReason(result);
      if (reason) {
        return { status: false, data: result, reason, message: reason };
      }

      return {
        status: true,
        data: result,
        reason: null,
        message: "Product exist",
      };
    };
    //Why a product cannot be purchased, null when it is available
    checkUnavailableReason = (
      product: IMerch
    ): "inactive" | "expired" | "out-of-stock" | null => {
      if (!product.is_active) return "inactive";
      if (this.checkExpired(product)) return "expired";
      if (!this.checkStocks(product.stocks)) return "out-of-stock";
      return null;
    };
    //Check if product is available
    checkAvailable = (product: IMerch) => {
      return this.checkUnavailableReason(product) === null;
    };
    //Check if stocks is sufficient
    checkStocks = (stocks: number) => {
      return stocks > 0 ? true : false;
    };
    //Check if the sale period of a merchandise has already ended,
    //a product without an end date never expires
    checkExpired = (product: Pick<IMerch, "end_date">) => {
      if (!product.end_date) return false;
      return new Date() > new Date(product.end_date);
    };
    //Check stocks if sufficient for the quantity orders to be deduct
    checkSufficientStocks = (
      productStocks: number,
      itemQuantity: number
    ): boolean => {
      return productStocks - itemQuantity >= 0;
    };
    //Update stocks when ordering, can be used in process orders
    updateStocks = async (
      product_id: Types.ObjectId,
      quantity: number,
      session: ClientSession
    ) => {
      const result = await Merch.updateOne(
        {
          _id: product_id,
          stocks: {
            $gte: quantity,
          },
        },
        {
          $inc: {
            stocks: -quantity,
          },
        }
      ).session(session);

      //If there is an error deducting stocks
      if (result.modifiedCount === 0) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError(
          `Could not deduct the stocks for product ID ${product_id}`,
          404
        );
      } else {
        return true;
      }
    };
    updateManyStocks = async (
      products: {
        product_id: Types.ObjectId;
        quantity: number;
      }[],
      session: ClientSession
    ) => {
      const result = await Merch.bulkWrite(
        products.map((item) => ({
          updateOne: {
            filter: {
              _id: item.product_id,
              stocks: {
                $gte: item.quantity,
              },
            },
            update: {
              $inc: {
                stocks: -item.quantity,
              },
            },
          },
        })),
        { session }
      );

      if (result.modifiedCount !== products.length) {
        throw new AppError("Some products have insufficient stocks", 400);
      }
    };

    restoreStocks = async (
      product_id: Types.ObjectId,
      quantity: number,
      session: ClientSession
    ) => {
      await Merch.updateOne(
        { _id: product_id },
        { $inc: { stocks: quantity } }
      ).session(session);
    };

    toggleMerchActive = async (product_id: Types.ObjectId, active: boolean) => {
      const result = await Merch.findByIdAndUpdate(
        product_id,
        { is_active: active },
        { new: true }
      );
      if (!result) {
        throw new AppError("Product not found", 404);
      }
      return result;
    };

    updateStockById = async (
      product_id: Types.ObjectId,
      stocks: number
    ) => {
      const result = await Merch.findByIdAndUpdate(
        product_id,
        { $set: { stocks } },
        { new: true }
      );
      if (!result) {
        throw new AppError("Product not found", 404);
      }
      return result;
    };
  }

  const merchandiseService = new MerchandiseService();
  export { merchandiseService };
