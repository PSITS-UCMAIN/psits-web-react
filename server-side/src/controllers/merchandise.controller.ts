import { Merch } from "../models/merch.model";
import { Student } from "../models/student.model";
import { Orders } from "../models/orders.model";
import { Admin } from "../models/admin.model";
import { Log } from "../models/log.model";
import { Event } from "../models/event.model";
import mongoose, { Types } from "mongoose";
import { IMerch } from "../models/merch.interface";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";
dotenv.config();
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const createMerchandiseController = async (
  req: Request,
  res: Response
) => {
  const {
    name,
    price,
    stocks,
    batch,
    description,
    selectedVariations,
    selectedSizes,
    selectedAudience,
    created_by,
    start_date,
    end_date,
    category,
    isEvent,
    eventDate,
    type,
    control,
    sessionConfig,
  } = req.body;

  let parsedSelectedSizes;
  if (typeof selectedSizes === "string") {
    try {
      parsedSelectedSizes = JSON.parse(selectedSizes);
    } catch (error) {
      console.error("Invalid JSON format for selectedSizes:", selectedSizes);
      return res.status(400).json({ error: "Invalid selectedSizes format" });
    }
  }

  // Parse sessionConfig if it's a string
  let parsedSessionConfig;
  if (typeof sessionConfig === "string") {
    try {
      parsedSessionConfig = JSON.parse(sessionConfig);
    } catch (error) {
      console.error("Invalid JSON format for sessionConfig:", sessionConfig);
      return res.status(400).json({ error: "Invalid sessionConfig format" });
    }
  } else {
    parsedSessionConfig = sessionConfig;
  }

  // Get the URLs of the uploaded images

  const imageUrl =
    (req.files as Express.MulterS3.File[] | undefined)?.map(
      (file) => file.location
    ) || [];

  try {
    const newMerch = new Merch({
      name,
      price,
      stocks,
      batch,
      description,
      selectedVariations: selectedVariations.split(","),
      selectedSizes: parsedSelectedSizes,
      selectedAudience,
      created_by,
      start_date,
      end_date,
      category,
      type,
      control,
      imageUrl,
    });

    const newMerchId = await newMerch.save();

    if (isEvent === "true" || isEvent === true) {
      try {
        const newEvent = new Event({
          eventId: newMerchId._id,
          eventName: name,
          eventImage: imageUrl,
          eventDate: eventDate,
          eventDescription: description,
          status: "Ongoing",
          attendanceType: "ticketed",
          sessionConfig: {
            morning: {
              enabled: parsedSessionConfig?.isMorningEnabled || false,
              timeRange: parsedSessionConfig?.morningTime || "",
            },
            afternoon: {
              enabled: parsedSessionConfig?.isAfternoonEnabled || false,
              timeRange: parsedSessionConfig?.afternoonTime || "",
            },
            evening: {
              enabled: parsedSessionConfig?.isEveningEnabled || false,
              timeRange: parsedSessionConfig?.eveningTime || "",
            },
          },
          attendees: [],
          createdBy: req.admin.name,
        });

        await newEvent.save();
      } catch (error) {
        console.error("Error creating event:", error);
      }
    }

    const admin = await Admin.findOne({ name: created_by });

    if (admin) {
      const log = new Log({
        admin: admin.name,
        admin_id: admin._id,
        action: "Merchandise Creation",
        target: newMerch.name,
        target_id: newMerch._id,
        target_model: "Merchandise",
      });

      await log.save();
    }
    res.status(200).json("Merch Addition Successful");
  } catch (error) {
    console.error("Error saving new merch:", error);
    res.status(500).send(error);
  }
};

export const retrieveActiveMerchandiseController = async (
  req: Request,
  res: Response
) => {
  try {
    const merches: IMerch[] = await Merch.find({
      is_active: true,
    });
    if (!merches) {
      res.status(400).json({ message: "No Available Merchandise" });
    }
    res.status(200).json(merches);
  } catch (error) {
    console.error("Error fetching merches:", error);
    res.status(500).send(error);
  }
};

export const retrieveSpecificMerchandiseController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const merch = await Merch.findById(id);

    if (!merch) {
      return res.status(404).json({ message: "Merchandise not found" });
    }

    res.status(200).json(merch);
  } catch (error) {
    console.error("Error fetching merch:", error);
    res.status(500).send(error);
  }
};

export const retrieveMerchAdminController = async (
  req: Request,
  res: Response
) => {
  try {
    const merches: IMerch[] = await Merch.find();
    if (!merches) {
      res.status(400).json({ message: "No Available Merchandise" });
    }
    res.status(200).json(merches);
  } catch (error) {
    console.error("Error fetching merches:", error);
    res.status(500).send(error);
  }
};

export const deleteReportController = async (req: Request, res: Response) => {
  const { product_id, id, merchName } = req.body;

  try {
    // Ensure the request comes from an admin
    if (req.admin.role !== "Admin") {
      return res.status(403).json({ message: "Forbidden: Admin access only." });
    }
    const productId = new mongoose.Types.ObjectId(product_id);
    const objectId = new mongoose.Types.ObjectId(id);

    const result = await Merch.findOneAndUpdate(
      { _id: productId },
      { $pull: { order_details: { _id: objectId } } },
      { new: true }
    );

    if (!result) {
      return res
        .status(404)
        .json({ message: "Merch item not found or update failed." });
    }

    // Log the deletion action
    if (req.admin) {
      const log = new Log({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: "Deleted Merchandise Report",
        target: merchName,
        target_id: objectId,
        target_model: "Merchandise Report",
      });

      await log.save();
    }

    res.status(200).json({
      message: "Success deleting student in reports",
    });
  } catch (error) {
    console.error("Error deleting order detail:", error);
    res.status(500).json({ message: "Error deleting order detail." });
  }
};

export const updateMerchandiseController = async (
  req: Request,
  res: Response
) => {
  const {
    name,
    price,
    stocks,
    batch,
    description,
    selectedVariations,
    selectedSizes,
    start_date,
    end_date,
    category,
    type,
    control,
    selectedAudience,
    removeImage,
  } = req.body;
  try {
    const id = req.params._id;

    let imageUrl =
      (req.files as Express.MulterS3.File[] | undefined)?.map(
        (file) => file.location
      ) || [];
    let parsedSelectedSizes;
    if (typeof selectedSizes === "string") {
      try {
        parsedSelectedSizes = JSON.parse(selectedSizes);
      } catch (error) {
        console.error("Invalid JSON format for selectedSizes:", selectedSizes);
        return res.status(400).json({ error: "Invalid selectedSizes format" });
      }
    }

    const imagesToRemove = Array.isArray(removeImage)
      ? removeImage
      : removeImage
      ? [removeImage]
      : [];

    const imageKeys = imagesToRemove.length
      ? imagesToRemove.map((url) => url.replace(process.env.bucketUrl, ""))
      : [];

    await Promise.all(
      imageKeys.map((imageKey) =>
        s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: imageKey,
          })
        )
      )
    );
    const existingMerch = await Merch.findById(id);
    if (!existingMerch) {
      console.error("Merch not found");
      return res.status(404).send("Merch not found");
    }

    let updatedImages = existingMerch.imageUrl?.filter(
      (img) => !imagesToRemove.includes(img)
    );

    if (updatedImages) {
      updatedImages = [...updatedImages, ...imageUrl];
    }
    const updatedResult = await Merch.updateOne(
      { _id: id },
      { imageUrl: imagesToRemove },
      { $pull: { imageUrl: imagesToRemove } }
    );
    if (updatedResult.modifiedCount === 0) {
      console.error("Failed to update merch images");
      return res.status(500).send("Failed to update merch images");
    }

    const updateFields = {
      name: name,
      price: price,
      stocks: stocks,
      batch: batch,
      description: description,
      selectedVariations: selectedVariations.split(","),
      selectedSizes: parsedSelectedSizes,
      start_date: start_date,
      end_date: end_date,
      category: category,
      type: type,
      control: control,
      imageUrl: updatedImages,
      selectedAudience: selectedAudience,
    };

    const result = await Merch.updateOne({ _id: id }, { $set: updateFields });
    const event_result = await Event.updateOne(
      { eventId: id },
      { $set: { eventName: name, eventDescription: description } }
    );
    if (result.matchedCount === 0) {
      console.error("Merch not found");
      return res.status(404).send("Merch not found");
    }
    const selectedAudienceArray = selectedAudience.includes(",")
      ? selectedAudience.split(",").map((aud: string) => aud.trim())
      : [selectedAudience];

    const query = selectedAudienceArray.includes("all")
      ? { "cart.product_id": id }
      : { "cart.product_id": id, role: { $in: selectedAudienceArray } };

    const students = await Student.find(query);

    if (students) {
      for (const student of students) {
        for (let item of student.cart) {
          if (item.product_id.toString() === id) {
            item.product_name = name;
            item.price = price;
            item.sub_total = price * item.quantity;
            item.imageUrl1 = imageUrl[0];
            item.start_date = start_date;
            item.end_date = end_date;
            item.category = category;
            item.batch = batch;
            item.limited = control === "limited-purchase" ? true : false;
            item.quantity = control === "limited-purchase" ? 1 : item.quantity;
          }
        }

        await student.save();
      }
    }
    const queryOrders = selectedAudienceArray.includes("all")
      ? { "items.product_id": id, order_status: "Pending" }
      : {
          "items.product_id": id,
          order_status: "Pending",
          role: { $in: selectedAudienceArray },
        };

    const orders = await Orders.find(queryOrders);

    if (orders) {
      for (const order of orders) {
        let newTotal = 0;

        for (let item of order.items) {
          if (item.product_id.toString() === id) {
            item.product_name = name;
            item.price = price;

            item.imageUrl1 = imageUrl[0];

            item.category = category;
            item.batch = batch;
            item.limited = control === "limited-purchase" ? true : false;
            item.quantity = control === "limited-purchase" ? 1 : item.quantity;
            item.sub_total = price * item.quantity;
          }

          newTotal += item.sub_total;
        }

        order.total = newTotal;

        await order.save();
      }
    }

    if (req.admin) {
      const log = new Log({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: "Edited Merchandise",
        target: req.body.name,
        target_id: req.params._id,
        target_model: "Merchandise",
      });

      await log.save();
    }

    res.status(200).send("Merch, carts, and orders updated successfully");
  } catch (error) {
    console.error(error);
    console.error("Error updating merch, carts, and orders:", error);
    res.status(500).send(error);
  }
};

export const softDeleteMerchandiseController = async (
  req: Request,
  res: Response
) => {
  const { _id } = req.body;

  try {
    const product_id = new Types.ObjectId(_id);

    // Find the merchandise before updating for logging purposes
    const merch = await Merch.findById(product_id);
    if (!merch) {
      return res.status(404).json({ message: "Merch not found" });
    }

    const result = await Merch.updateOne(
      { _id: product_id },
      { $set: { is_active: false } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Merch not found" });
    }

    // Log the soft delete action
    if (req.admin) {
      const log = new Log({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: "Soft Deleted Merchandise",
        target: merch.name,
        target_id: merch._id,
        target_model: "Merchandise",
      });

      await log.save();
    }

    res.status(200).json({ message: "Merch deleted successfully" });
  } catch (error) {
    console.error("Error deleting merch:", error);
    res.status(500).send("Error deleting merch");
  }
};

export const publishMerchandiseController = async (
  req: Request,
  res: Response
) => {
  const { _id } = req.body;

  try {
    const product_id = new Types.ObjectId(_id);

    // Find the merchandise before updating for logging purposes
    const merch = await Merch.findById(product_id);
    if (!merch) {
      return res.status(404).json({ message: "Merch not found" });
    }

    const result = await Merch.updateOne(
      { _id: product_id },
      { $set: { is_active: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Merch not found" });
    }

    // Log the publish action
    if (req.admin) {
      const log = new Log({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: "Re-published Soft Deleted Merchandise",
        target: merch.name,
        target_id: merch._id,
        target_model: "Merchandise",
      });

      await log.save();
    }

    res.status(200).json({ message: "Merch published successfully" });
  } catch (error) {
    console.error("Error publishing merch:", error);
    res.status(500).send("Error publishing merch");
  }
};
