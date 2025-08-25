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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishMerchandiseController = exports.softDeleteMerchandiseController = exports.updateMerchandiseController = exports.deleteReportController = exports.retrieveMerchAdminController = exports.retrieveSpecificMerchandiseController = exports.retrieveActiveMerchandiseController = exports.createMerchandiseController = void 0;
const merch_model_1 = require("../models/merch.model");
const student_model_1 = require("../models/student.model");
const orders_model_1 = require("../models/orders.model");
const admin_model_1 = require("../models/admin.model");
const log_model_1 = require("../models/log.model");
const event_model_1 = require("../models/event.model");
const mongoose_1 = __importStar(require("mongoose"));
const client_s3_1 = require("@aws-sdk/client-s3");
const dotenv_1 = __importDefault(require("dotenv"));
const client_s3_2 = require("@aws-sdk/client-s3");
dotenv_1.default.config();
const s3Client = new client_s3_2.S3Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});
const createMerchandiseController = async (req, res) => {
    const { name, price, stocks, batch, description, selectedVariations, selectedSizes, selectedAudience, created_by, start_date, end_date, category, isEvent, eventDate, type, control, sessionConfig, } = req.body;
    let parsedSelectedSizes;
    if (typeof selectedSizes === "string") {
        try {
            parsedSelectedSizes = JSON.parse(selectedSizes);
        }
        catch (error) {
            console.error("Invalid JSON format for selectedSizes:", selectedSizes);
            return res.status(400).json({ error: "Invalid selectedSizes format" });
        }
    }
    // Parse sessionConfig if it's a string
    let parsedSessionConfig;
    if (typeof sessionConfig === "string") {
        try {
            parsedSessionConfig = JSON.parse(sessionConfig);
        }
        catch (error) {
            console.error("Invalid JSON format for sessionConfig:", sessionConfig);
            return res.status(400).json({ error: "Invalid sessionConfig format" });
        }
    }
    else {
        parsedSessionConfig = sessionConfig;
    }
    // Get the URLs of the uploaded images
    const imageUrl = req.files?.map((file) => file.location) || [];
    try {
        const newMerch = new merch_model_1.Merch({
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
                const newEvent = new event_model_1.Event({
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
            }
            catch (error) {
                console.error("Error creating event:", error);
            }
        }
        const admin = await admin_model_1.Admin.findOne({ name: created_by });
        if (admin) {
            const log = new log_model_1.Log({
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
    }
    catch (error) {
        console.error("Error saving new merch:", error);
        res.status(500).send(error);
    }
};
exports.createMerchandiseController = createMerchandiseController;
const retrieveActiveMerchandiseController = async (req, res) => {
    try {
        const merches = await merch_model_1.Merch.find({
            is_active: true,
        });
        if (!merches) {
            res.status(400).json({ message: "No Available Merchandise" });
        }
        res.status(200).json(merches);
    }
    catch (error) {
        console.error("Error fetching merches:", error);
        res.status(500).send(error);
    }
};
exports.retrieveActiveMerchandiseController = retrieveActiveMerchandiseController;
const retrieveSpecificMerchandiseController = async (req, res) => {
    try {
        const { id } = req.params;
        const merch = await merch_model_1.Merch.findById(id);
        if (!merch) {
            return res.status(404).json({ message: "Merchandise not found" });
        }
        res.status(200).json(merch);
    }
    catch (error) {
        console.error("Error fetching merch:", error);
        res.status(500).send(error);
    }
};
exports.retrieveSpecificMerchandiseController = retrieveSpecificMerchandiseController;
const retrieveMerchAdminController = async (req, res) => {
    try {
        const merches = await merch_model_1.Merch.find();
        if (!merches) {
            res.status(400).json({ message: "No Available Merchandise" });
        }
        res.status(200).json(merches);
    }
    catch (error) {
        console.error("Error fetching merches:", error);
        res.status(500).send(error);
    }
};
exports.retrieveMerchAdminController = retrieveMerchAdminController;
const deleteReportController = async (req, res) => {
    const { product_id, id, merchName } = req.body;
    try {
        // Ensure the request comes from an admin
        if (req.admin.role !== "Admin") {
            return res.status(403).json({ message: "Forbidden: Admin access only." });
        }
        const productId = new mongoose_1.default.Types.ObjectId(product_id);
        const objectId = new mongoose_1.default.Types.ObjectId(id);
        const result = await merch_model_1.Merch.findOneAndUpdate({ _id: productId }, { $pull: { order_details: { _id: objectId } } }, { new: true });
        if (!result) {
            return res
                .status(404)
                .json({ message: "Merch item not found or update failed." });
        }
        // Log the deletion action
        if (req.admin) {
            const log = new log_model_1.Log({
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
    }
    catch (error) {
        console.error("Error deleting order detail:", error);
        res.status(500).json({ message: "Error deleting order detail." });
    }
};
exports.deleteReportController = deleteReportController;
const updateMerchandiseController = async (req, res) => {
    const { name, price, stocks, batch, description, selectedVariations, selectedSizes, start_date, end_date, category, type, control, selectedAudience, removeImage, } = req.body;
    try {
        const id = req.params._id;
        let imageUrl = req.files?.map((file) => file.location) || [];
        let parsedSelectedSizes;
        if (typeof selectedSizes === "string") {
            try {
                parsedSelectedSizes = JSON.parse(selectedSizes);
            }
            catch (error) {
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
        await Promise.all(imageKeys.map((imageKey) => s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: imageKey,
        }))));
        const existingMerch = await merch_model_1.Merch.findById(id);
        if (!existingMerch) {
            console.error("Merch not found");
            return res.status(404).send("Merch not found");
        }
        let updatedImages = existingMerch.imageUrl?.filter((img) => !imagesToRemove.includes(img));
        if (updatedImages) {
            updatedImages = [...updatedImages, ...imageUrl];
        }
        const updatedResult = await merch_model_1.Merch.updateOne({ _id: id }, { imageUrl: imagesToRemove }, { $pull: { imageUrl: imagesToRemove } });
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
        const result = await merch_model_1.Merch.updateOne({ _id: id }, { $set: updateFields });
        const event_result = await event_model_1.Event.updateOne({ eventId: id }, { $set: { eventName: name, eventDescription: description } });
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
        const students = await student_model_1.Student.find(query);
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
        const orders = await orders_model_1.Orders.find(queryOrders);
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
            const log = new log_model_1.Log({
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
    }
    catch (error) {
        console.error(error);
        console.error("Error updating merch, carts, and orders:", error);
        res.status(500).send(error);
    }
};
exports.updateMerchandiseController = updateMerchandiseController;
const softDeleteMerchandiseController = async (req, res) => {
    const { _id } = req.body;
    try {
        const product_id = new mongoose_1.Types.ObjectId(_id);
        // Find the merchandise before updating for logging purposes
        const merch = await merch_model_1.Merch.findById(product_id);
        if (!merch) {
            return res.status(404).json({ message: "Merch not found" });
        }
        const result = await merch_model_1.Merch.updateOne({ _id: product_id }, { $set: { is_active: false } });
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Merch not found" });
        }
        // Log the soft delete action
        if (req.admin) {
            const log = new log_model_1.Log({
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
    }
    catch (error) {
        console.error("Error deleting merch:", error);
        res.status(500).send("Error deleting merch");
    }
};
exports.softDeleteMerchandiseController = softDeleteMerchandiseController;
const publishMerchandiseController = async (req, res) => {
    const { _id } = req.body;
    try {
        const product_id = new mongoose_1.Types.ObjectId(_id);
        // Find the merchandise before updating for logging purposes
        const merch = await merch_model_1.Merch.findById(product_id);
        if (!merch) {
            return res.status(404).json({ message: "Merch not found" });
        }
        const result = await merch_model_1.Merch.updateOne({ _id: product_id }, { $set: { is_active: true } });
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Merch not found" });
        }
        // Log the publish action
        if (req.admin) {
            const log = new log_model_1.Log({
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
    }
    catch (error) {
        console.error("Error publishing merch:", error);
        res.status(500).send("Error publishing merch");
    }
};
exports.publishMerchandiseController = publishMerchandiseController;
