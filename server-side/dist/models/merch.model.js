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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Merch = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const orderDetailSchema = new mongoose_1.Schema({
    product_name: {
        type: String,
    },
    reference_code: {
        type: String,
    },
    id_number: {
        type: String,
        required: true,
    },
    student_name: {
        type: String,
        required: true,
    },
    rfid: {
        type: String,
    },
    course: {
        type: String,
    },
    year: {
        type: Number,
    },
    batch: {
        type: String,
    },
    size: {
        type: [String],
    },
    variation: {
        type: [String],
    },
    quantity: {
        type: Number,
    },
    total: {
        type: Number,
        required: true,
    },
    order_date: {
        type: String,
        required: true,
    },
    transaction_date: {
        type: String,
    },
});
const salesDataSchema = new mongoose_1.Schema({
    unitsSold: {
        type: Number,
        default: 0,
    },
    totalRevenue: {
        type: Number,
        default: 0,
    },
});
const merchSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    stocks: {
        type: Number,
        required: true,
    },
    batch: {
        type: String,
    },
    description: {
        type: String,
    },
    selectedVariations: {
        type: [String],
    },
    selectedSizes: {
        type: Map,
        of: new mongoose_1.default.Schema({
            custom: Boolean,
            price: String,
        }),
    },
    selectedAudience: {
        type: String,
    },
    control: {
        type: String,
        required: true,
    },
    created_by: {
        type: String,
        required: true,
    },
    start_date: {
        type: Date,
        required: true,
    },
    end_date: {
        type: Date,
    },
    is_active: {
        type: Boolean,
        default: true,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: [String],
    },
    sales_data: {
        type: salesDataSchema,
        default: () => ({}),
    },
    order_details: [orderDetailSchema],
}, { timestamps: true });
exports.Merch = mongoose_1.default.model("merch", merchSchema);
