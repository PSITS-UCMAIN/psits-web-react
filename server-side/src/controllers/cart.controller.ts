import { CartItem } from "../models/cart.model";
import { ICart } from "../models/cart.interface";
import { Student, IStudentDocument } from "../models/student.model";
import mongoose, { Types } from "mongoose";
import { Request, Response } from "express";

export const addCartController = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const {
    id_number,
    product_id,
    category,
    product_name,
    end_date,
    start_date,
    limited,
    price,
    quantity,
    sub_total,
    variation,
    sizes,
    batch,
    imageUrl1,
  } = req.body;

  try {
    const student: IStudentDocument | null = await Student.findOne({
      id_number,
    }).session(session);

    if (!student) {
      res.status(400).json({ message: "No student found!" });
    }

    const productExists = student?.cart.find(
      (item: any) => item.product_id.toString() === product_id
    );

    if (productExists) {
      const existingCart = await CartItem.findOne({
        _id: productExists._id,
      }).session(session);

      if (existingCart) {
        await CartItem.updateOne(
          { _id: productExists._id },
          {
            $set: {
              quantity: existingCart.quantity + quantity,
            },
          }
        ).session(session);

        if (student) {
          const itemIndex = student?.cart.findIndex(
            (item: ICart) => item.product_id.toString() === product_id
          );

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
    } else {
      const newCart = new CartItem({
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
  } catch (error) {
    session.abortTransaction();
    session.endSession();
    if (error) {
      res.status(400).json({ message: "Cannot add item in cart" });
    } else {
      console.error({ message: "Error saving new cart:", error });
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

export const viewStudentCartController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.query;

  try {
    const student: IStudentDocument | null = await Student.findOne({
      id_number: id_number,
    });

    if (student) {
      if (student.cart.length > 0) res.status(200).json(student.cart);
    } else {
      res.status(400).json({ message: "No Records" });
    }
  } catch (error) {
    console.error("Error fetching Cart:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const deleteItemCartController = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { id_number, cart_id } = req.body;

  try {
    const result: IStudentDocument | null = await Student.findOneAndUpdate(
      { id_number: id_number },
      { $pull: { cart: { _id: cart_id } } },
      { new: true, useFindAndModify: false }
    ).session(session);

    const cartId = new Types.ObjectId(cart_id);

    const cartResult = await CartItem.findByIdAndDelete(cartId).session(
      session
    );

    if (!result && !cartResult) {
      await session.abortTransaction();
      session.endSession();
      res
        .status(400)
        .json({ message: "Student not found or cart item not found." });
    } else {
      await session.commitTransaction();
      session.endSession();
      res.status(200).json({ message: "Cart item deleted successfully." });
    }
  } catch (error) {
    console.error("Error deleting cart item:", error);
  }
};
