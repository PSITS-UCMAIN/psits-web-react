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
import path from "path";
import { S3Client } from "@aws-sdk/client-s3";
import { expiryStatus } from "../custom_function/conditional_dates";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

//How long an expired product keeps showing in the shop, greyed out, before it
//is dropped from the listing entirely
const EXPIRED_GRACE_DAYS = 30;

const r2BucketName = process.env.R2_BUCKET_NAME;
if (!r2BucketName) throw new Error("R2_BUCKET_NAME is not configured");
const r2Endpoint = `https://${r2BucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

type SelectedSizePricing = {
  custom?: boolean;
  price?: string | number | null;
};

const getCustomSizePrice = (
  selectedSizes: unknown,
  sizes: unknown
): number | null => {
  const selectedSize = Array.isArray(sizes) ? sizes[0] : sizes;
  if (!selectedSize || !selectedSizes) return null;

  const sizeConfig =
    selectedSizes instanceof Map
      ? selectedSizes.get(String(selectedSize))
      : typeof selectedSizes === "object"
        ? (selectedSizes as Record<string, SelectedSizePricing>)[
            String(selectedSize)
          ]
        : undefined;

  const parsedPrice = Number(sizeConfig?.price);
  return sizeConfig?.custom && Number.isFinite(parsedPrice) && parsedPrice > 0
    ? parsedPrice
    : null;
};

class MerchandiseController {
  async create(req: Request, res: Response) {
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

    let parsedSelectedSizes: Record<string, SelectedSizePricing> | undefined;
    if (typeof selectedSizes === "string") {
      try {
        parsedSelectedSizes = JSON.parse(selectedSizes);
      } catch (error) {
        console.error("Invalid JSON format for selectedSizes:", selectedSizes);
        return res.status(400).json({ error: "Invalid selectedSizes format" });
      }
    } else if (selectedSizes && typeof selectedSizes === "object") {
      parsedSelectedSizes = selectedSizes as Record<
        string,
        SelectedSizePricing
      >;
    }

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
  }

  async retrieveAll(req: Request, res: Response) {
    try {
      const merches = await Merch.find()
        .select(
          "name price stocks batch description selectedVariations selectedSizes selectedAudience control created_by start_date end_date is_active category type imageUrl"
        )
        .lean();
      if (!merches || merches.length === 0) {
        return res.status(200).json({ data: [] });
      }
      res.status(200).json({ data: merches });
    } catch (error) {
      console.error("Error fetching merches:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }

  async retrieveActive(req: Request, res: Response) {
    try {
      const merches = await Merch.find({
        is_active: true,
      })
        .select(
          "name price stocks batch description selectedVariations selectedSizes selectedAudience control created_by start_date end_date category type imageUrl"
        )
        .lean();
      if (!merches || merches.length === 0) {
        return res.status(200).json({ data: [] });
      }
      res.status(200).json({ data: merches });
    } catch (error) {
      console.error("Error fetching merches:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }

  async retrieveById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const merch = await Merch.findById(id);

      if (!merch) {
        return res.status(404).json({ message: "Merchandise not found" });
      }

      res.status(200).json({ data: merch });
    } catch (error) {
      console.error("Error fetching merch:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }

  async update(req: Request, res: Response) {
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
      let parsedSelectedSizes: Record<string, SelectedSizePricing> | undefined;
      if (typeof selectedSizes === "string") {
        try {
          parsedSelectedSizes = JSON.parse(selectedSizes);
        } catch (error) {
          console.error(
            "Invalid JSON format for selectedSizes:",
            selectedSizes
          );
          return res
            .status(400)
            .json({ error: "Invalid selectedSizes format" });
        }
      } else if (selectedSizes && typeof selectedSizes === "object") {
        parsedSelectedSizes = selectedSizes as Record<
          string,
          SelectedSizePricing
        >;
      }

      const imagesToRemove = Array.isArray(removeImage)
        ? removeImage
        : removeImage
          ? [removeImage]
          : [];

      const imageKeys = imagesToRemove.length
        ? imagesToRemove
            .map((url) => {
              try {
                const p = new URL(url).pathname.replace(/^\//, "");
                if (!p.startsWith("merchandise/")) {
                  console.error("Unexpected image key prefix:", p);
                  return null;
                }
                return p;
              } catch (e) {
                console.error("Invalid image URL:", url);
                return null;
              }
            })
            .filter((k): k is string => k !== null)
        : [];

      await Promise.all(
        imageKeys.map((imageKey) =>
          r2Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
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
      await Event.updateOne(
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
      const basePrice = Number(price);
      const getUpdatedItemPrice = (sizes: unknown) =>
        getCustomSizePrice(parsedSelectedSizes, sizes) ?? basePrice;

      if (students) {
        for (const student of students) {
          for (let item of student.cart) {
            if (item.product_id.toString() === id) {
              const itemPrice = getUpdatedItemPrice(item.sizes);
              item.product_name = name;
              item.price = itemPrice;
              item.sub_total = itemPrice * item.quantity;
              item.imageUrl1 = imageUrl[0];
              item.start_date = start_date;
              item.end_date = end_date;
              item.category = category;
              item.batch = batch;
              item.limited = control === "limited-purchase" ? true : false;
              item.quantity =
                control === "limited-purchase" ? 1 : item.quantity;
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
              const itemPrice = getUpdatedItemPrice(item.sizes);
              item.product_name = name;
              item.price = itemPrice;
              item.batch = batch;
              item.limited = control === "limited-purchase" ? true : false;
              item.quantity =
                control === "limited-purchase" ? 1 : item.quantity;
              item.sub_total = itemPrice * item.quantity;
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
  }

  async softDelete(req: Request, res: Response) {
    const { _id } = req.body;

    try {
      const product_id = new Types.ObjectId(_id);

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
  }

  async hardDelete(req: Request, res: Response) {
    const { _id } = req.body;

    try {
      const product_id = new Types.ObjectId(_id);

      const merch = await Merch.findById(product_id);
      if (!merch) {
        return res.status(404).json({ message: "Merch not found" });
      }
      if (merch.is_active) {
        return res
          .status(400)
          .json({
            message: "Merch must be soft-deleted first before hard delete",
          });
      }

      // Delete images from R2
      if (merch.imageUrl && merch.imageUrl.length > 0) {
        const imageKeys = merch.imageUrl
          .map((url) => {
            try {
              return new URL(String(url)).pathname.replace(/^\//, "");
            } catch {
              return null;
            }
          })
          .filter((key): key is string => key !== null);

        await Promise.all(
          imageKeys.map((key) =>
            r2Client.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
              })
            )
          )
        );
      }

      await Merch.findByIdAndDelete(product_id);

      if (req.admin) {
        const log = new Log({
          admin: req.admin.name,
          admin_id: req.admin._id,
          action: "Hard Deleted Merchandise",
          target: merch.name,
          target_id: merch._id,
          target_model: "Merchandise",
        });
        await log.save();
      }

      res.status(200).json({ message: "Merch permanently deleted" });
    } catch (error) {
      console.error("Error hard deleting merch:", error);
      res.status(500).send("Error hard deleting merch");
    }
  }

  async publish(req: Request, res: Response) {
    const { _id } = req.body;

    try {
      const product_id = new Types.ObjectId(_id);

      const merch = await Merch.findById(product_id);
      if (!merch) {
        return res.status(404).json({ message: "Merch not found" });
      }

      //Publishing an already expired product would leave it invisible in the
      //shop, so ask the admin to extend the sale period first
      if (merch.end_date && new Date() > new Date(merch.end_date)) {
        return res.status(400).json({
          message:
            "This product's sale period has ended. Extend the sale before publishing it.",
        });
      }

      const result = await Merch.updateOne(
        { _id: product_id },
        { $set: { is_active: true } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Merch not found" });
      }

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
  }

  async retrievePublished(req: Request, res: Response) {
    try {
      const now = new Date();
      //Recently expired merchandise is still returned so the shop can render it
      //as expired instead of silently dropping it from the grid
      const graceCutoff = new Date(
        now.getTime() - EXPIRED_GRACE_DAYS * 24 * 60 * 60 * 1000
      );

      const merches = await Merch.find({
        is_active: true,
        start_date: { $lte: now },
        $or: [{ end_date: { $gt: graceCutoff } }, { end_date: null }],
      })
        .select(
          "name price stocks batch description selectedVariations selectedSizes selectedAudience control created_by start_date end_date category type imageUrl"
        )
        .lean();

      if (!merches || merches.length === 0) {
        return res.status(200).json({ data: [] });
      }

      res.status(200).json({ data: merches });
    } catch (error) {
      console.error("Error retrieving published merchandise:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }

  async getReports(req: Request, res: Response) {
    try {
      const merches = await Merch.find()
        .select(
          "name price batch start_date end_date category type sales_data order_details"
        )
        .lean()
        .sort({ createdAt: -1 });
      if (!merches) {
        res.status(400).json({ message: "No Available Merchandise" });
      }
      res.status(200).json(merches);
    } catch (error) {
      console.error("Error fetching merches:", error);
      res.status(500).send(error);
    }
  }
}

export const merchandiseController = new MerchandiseController();

export const hardDeleteSoftDeletedMerch = async (): Promise<{
  deletedCount: number;
}> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const expiredSoftDeleted = await Merch.find({
    is_active: false,
    updatedAt: { $lt: thirtyDaysAgo },
  }).lean();

  let deletedCount = 0;
  for (const merch of expiredSoftDeleted) {
    try {
      // Delete images from R2
      if (merch.imageUrl && merch.imageUrl.length > 0) {
        const imageKeys = merch.imageUrl
          .map((url) => {
            try {
              return new URL(String(url)).pathname.replace(/^\//, "");
            } catch {
              return null;
            }
          })
          .filter((key): key is string => key !== null);

        await Promise.all(
          imageKeys.map((key) =>
            r2Client.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
              })
            )
          )
        );
      }

      await Merch.findByIdAndDelete(merch._id);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to hard-delete merch ${merch._id}:`, error);
    }
  }

  return { deletedCount };
};
