"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const client_s3_1 = require("@aws-sdk/client-s3");
const merchandise_controller_1 = require("../controllers/merchandise.controller");
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const router = (0, express_1.Router)();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});
const upload = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
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
//Create Merchandise Route
router.post("/", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), upload.array("images", 3), merchandise_controller_1.createMerchandiseController);
//Retrieve All Active Merchandise
router.get("/retrieve", custom_authenticate_token_1.both_authenticate, merchandise_controller_1.retrieveActiveMerchandiseController);
//Retrieve Specific Merchandise
router.get("/retrieve/:id", custom_authenticate_token_1.both_authenticate, merchandise_controller_1.retrieveSpecificMerchandiseController);
router.get("/retrieve-admin", custom_authenticate_token_1.admin_authenticate, merchandise_controller_1.retrieveMerchAdminController);
//Delete Report in Merchandise
router.delete("/delete-report", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), merchandise_controller_1.deleteReportController);
//Update Merchandise Data
router.put("/update/:_id", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), upload.array("images", 3), merchandise_controller_1.updateMerchandiseController);
// DELETE merch by id (soft)
router.put("/delete-soft", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), merchandise_controller_1.softDeleteMerchandiseController);
// Publish merch
router.put("/publish", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), merchandise_controller_1.publishMerchandiseController);
exports.default = router;
