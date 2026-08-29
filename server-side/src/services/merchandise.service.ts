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
    //Check if product exist
    checkExist = async (product_id: Types.ObjectId) => {
      const result = await Merch.findById({ _id: product_id });
      if (!result) {
        throw new AppError("Product doesn't exist", 404);
      }

      if (this.checkAvailable(result) && this.checkStocks(result.stocks)) {
        return { status: true, data: result, message: "Product exist" };
      } else {
        return { status: false };
      }
    };
    //Check if product is available
    checkAvailable = (product: IMerch) => {
      return product.is_active ? true : false;
    };
    //Check if stocks is sufficient
    checkStocks = (stocks: number) => {
      return stocks > 0 ? true : false;
    };
    //Check if merchandise is expired
    checkExpired = async (product_id: Types.ObjectId) => {
      try {
        const result: any = await this.checkExist(product_id);

        //If not exist
        if (!result.status && !result.data) {
          return { status: false, message: result.message };
        }
        //Exist
        const currentDate = new Date(); //Depends on the local time of the server and pc
        //Check if expired
        const isExpired = currentDate > result.data.end_date;
        //Return the result using ternary operator
        return isExpired
          ? { status: true, message: "Item expired" }
          : { status: false, message: "Item is active" };
      } catch (error) {
        console.error(error);
        throw error;
      }
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
