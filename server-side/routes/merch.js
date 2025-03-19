const express = require("express");
const Merch = require("../models/MerchModel");
const Student = require("../models/StudentModel");
const Orders = require("../models/OrdersModel");
const Admin = require("../models/AdminModel");
const Log = require("../models/LogModel");
const Event = require("../models/EventsModel");
const { default: mongoose } = require("mongoose");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { ObjectId } = require("mongodb");
require("dotenv").config();
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, `merchandise/${Date.now()}_${file.originalname}`);
    },
  }),
});

router.post(
  "/",
  authenticateToken,
  upload.array("images", 3),
  async (req, res) => {
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
    } = req.body;

    // Get the URLs of the uploaded images
    const imageUrl = req.files.map((file) => file.location);

    try {
      const newMerch = new Merch({
        name,
        price,
        stocks,
        batch,
        description,
        selectedVariations: selectedVariations.split(","),
        selectedSizes: selectedSizes.split(","),
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

      if (isEvent) {
        try {
          const newEvent = new Event({
            eventId: newMerchId._id,
            eventName: name,
            eventImage: imageUrl,
            eventDate: eventDate,
            eventDescription: description,
            status: "Ongoing",
            attendees: [],
          });

          await newEvent.save();
        } catch (error) {
          console.error(error);
        }
      }

      const admin = await Admin.findOne({ name: created_by });

      const log = new Log({
        admin: admin.name,
        admin_id: admin._id,
        action: "Merchandise Creation",
        target: newMerch.name,
        target_id: newMerch._id,
        target_model: "Merchandise",
      });

      await log.save();

      res.status(201).json("Merch Addition Successful");
    } catch (error) {
      console.error("Error saving new merch:", error.message);
      res.status(500).send(error.message);
    }
  }
);

router.get("/retrieve", authenticateToken, async (req, res) => {
  try {
    const merches = await Merch.find({
      is_active: true,
    });
    res.status(200).json(merches);
  } catch (error) {
    console.error("Error fetching merches:", error.message);
    res.status(500).send(error.message);
  }
});

router.get("/retrieve/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const merch = await Merch.findById(id);

    if (!merch) {
      return res.status(404).json({ message: "Merchandise not found" });
    }

    res.status(200).json(merch);
  } catch (error) {
    console.error("Error fetching merch:", error.message);
    res.status(500).send(error.message);
  }
});

router.get("/retrieve-admin", authenticateToken, async (req, res) => {
  try {
    const merches = await Merch.find({});
    res.status(200).json(merches);
  } catch (error) {
    console.error("Error fetching merches:", error.message);
    res.status(500).send(error.message);
  }
});

router.delete("/delete-report", authenticateToken, async (req, res) => {
  const { product_id, id, merchName } = req.body;

  try {
    // Ensure the request comes from an admin
    if (req.role !== "Admin") {
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
    const log = new Log({
      admin: req.user.name,
      admin_id: req.user._id,
      action: "Deleted Merchandise Report",
      target: merchName,
      target_id: objectId,
      target_model: "Merchandise Report",
    });

    await log.save();
    ////console.log("Action logged successfully.");

    res.status(200).json({
      message: "Success deleting student in reports",
    });
  } catch (error) {
    console.error("Error deleting order detail:", error);
    res.status(500).json({ message: "Error deleting order detail." });
  }
});

router.put(
  "/update/:_id",
  authenticateToken,
  upload.array("images", 3),
  async (req, res) => {
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
      sales_data,
      selectedAudience,
      removeImage,
    } = req.body;
    try {
      const id = req.params._id;
      //console.log(removeImage);
      let imageUrl = req.files.map((file) => file.location);

      const imagesToRemove = Array.isArray(removeImage)
        ? removeImage
        : removeImage
        ? [removeImage]
        : [];

      const imageKeys = imagesToRemove.length
        ? imagesToRemove.map((url) => url.replace(process.env.bucketUrl, ""))
        : [];
      //console.log(imageKeys);
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
      let updatedImages = existingMerch.imageUrl.filter(
        (img) => !imagesToRemove.includes(img)
      );

      updatedImages = [...updatedImages, ...imageUrl];

      const updatedResult = await Merch.updateOne(
        { _id: id },
        { imageUrl: imagesToRemove },
        { $pull: { imageUrl: imagesToRemove } }
      );
      if (updatedResult.modifiedCount === 0) {
        console.error("Failed to update merch images");
        return res.status(500).send("Failed to update merch images");
      }

      if (imageUrl.length === 0) {
        imageUrl = existingMerch.imageUrl;
      }

      const updateFields = {
        name: name,
        price: price,
        stocks: stocks,
        batch: batch,
        description: description,
        selectedVariations: selectedVariations.split(","),
        selectedSizes: selectedSizes.split(","),
        start_date: start_date,
        end_date: end_date,
        category: category,
        type: type,
        control: control,
        imageUrl: updatedImages,
        selectedAudience: selectedAudience,
      };

      if (sales_data) {
        for (const key in sales_data) {
          if (sales_data.hasOwnProperty(key)) {
            updateFields[`sales_data.${key}`] = sales_data[key];
          }
        }
      }

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
        ? selectedAudience.split(",").map((aud) => aud.trim())
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
              item.product_name = name;
              item.price = price;

              item.imageUrl1 = imageUrl[0];

              item.category = category;
              item.batch = batch;
              item.limited = control === "limited-purchase" ? true : false;
              item.quantity =
                control === "limited-purchase" ? 1 : item.quantity;
              item.sub_total = price * item.quantity;
            }

            newTotal += item.sub_total;
          }

          order.total = newTotal;

          await order.save();
        }
      }

      // Log the edit merch action
      const log = new Log({
        admin: req.user.name,
        admin_id: req.user._id,
        action: "Edited Merchandise",
        target: req.body.name,
        target_id: req.params._id,
        target_model: "Merchandise",
      });

      await log.save();
      //console.log("Action logged successfully.");

      res.status(200).send("Merch, carts, and orders updated successfully");
    } catch (error) {
      console.error(error);
      console.error("Error updating merch, carts, and orders:", error.message);
      res.status(500).send(error.message);
    }
  }
);

// DELETE merch by id (soft)
router.put("/delete-soft", authenticateToken, async (req, res) => {
  const { _id } = req.body;

  try {
    const product_id = new ObjectId(_id);

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
    const log = new Log({
      admin: req.user.name,
      admin_id: req.user._id,
      action: "Soft Deleted Merchandise",
      target: merch.name,
      target_id: merch._id,
      target_model: "Merchandise",
    });

    await log.save();
    //console.log("Action logged successfully.");

    res.status(200).json({ message: "Merch deleted successfully" });
  } catch (error) {
    console.error("Error deleting merch:", error.message);
    res.status(500).send("Error deleting merch");
  }
});

// Publish merch
router.put("/publish", authenticateToken, async (req, res) => {
  const { _id } = req.body;

  try {
    const product_id = new ObjectId(_id);

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
    const log = new Log({
      admin: req.user.name,
      admin_id: req.user._id, // Admin's ID from token
      action: "Re-published Soft Deleted Merchandise",
      target: merch.name,
      target_id: merch._id,
      target_model: "Merchandise",
    });

    await log.save();
    //console.log("Action logged successfully.");

    res.status(200).json({ message: "Merch published successfully" });
  } catch (error) {
    console.error("Error publishing merch:", error.message);
    res.status(500).send("Error publishing merch");
  }
});

// ADD merch to cart as Student
router.put(
  "/add-to-cart/:student_id/:merch_id",
  authenticateToken,
  async (req, res) => {
    const { student_id, merch_id } = req.params;

    try {
      // Find the student by ID
      const student = await Student.findById(student_id);
      if (!student) {
        console.error("Not logged in! User not found.");
        return res
          .status(404)
          .json({ message: "Not logged in! User not found." });
      }

      // Convert merch_id to ObjectId
      const merchObjectId = new mongoose.Types.ObjectId(merch_id);

      // Check if the merch_id already exists in the cart
      if (student.cart.includes(merchObjectId)) {
        //console.log("Merch already in cart");
        return res.status(400).json({ message: "Merch already in cart!" });
      }

      // Add to cart
      student.cart.push(merchObjectId);
      await student.save();

      //console.log("Merch added to cart");
      return res.status(200).json({ message: "Merch added to cart" });
    } catch (error) {
      console.error("Error adding merch to cart:", error.message);
      return res
        .status(500)
        .json({ message: "Error adding merch to cart", error: error.message });
    }
  }
);

// GET cart list as Student
router.get("/cart/:student_id", authenticateToken, async (req, res) => {
  const student_id = req.params.student_id;

  try {
    const student = await Student.findById(student_id);

    if (!student) {
      console.error("Not logged in! User not found.");
      return res
        .status(404)
        .json({ message: "Not logged in! User not found." });
    }

    return res.status(200).json({ cart: student.cart });
  } catch (error) {
    console.error("Error viewing cart list!", error.message);
    return res
      .status(500)
      .json({ message: "Error viewing cart list!", error: error.message });
  }
});

// DELETE merch from cart as Student
router.delete(
  "/remove-from-cart/:student_id/:merch_id",
  authenticateToken,
  async (req, res) => {
    const { student_id, merch_id } = req.params;

    try {
      // Find the student by ID
      const student = await Student.findById(student_id);
      if (!student) {
        console.error("Not logged in! User not found.");
        return res
          .status(404)
          .json({ message: "Not logged in! User not found." });
      }

      // Convert merch_id to ObjectId
      const merchObjectId = new mongoose.Types.ObjectId(merch_id);

      // Find the index of the merch_id in the cart array
      const index = student.cart.indexOf(merchObjectId);
      if (index === -1) {
        console.error("Merch not found in cart.");
        return res.status(404).json({ message: "Merch not found in cart." });
      }

      // Remove the merch_id from the cart array
      student.cart.splice(index, 1);
      await student.save();

      //console.log("Merch removed from cart.");
      return res.status(200).json({ message: "Merch removed from cart." });
    } catch (error) {
      console.error("Error removing merch from cart:", error.message);
      return res.status(500).json({
        message: "Error removing merch from cart",
        error: error.message,
      });
    }
  }
);

module.exports = router;
