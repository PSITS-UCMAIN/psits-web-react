const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const orderDetailSchema = new Schema({
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
    type: Array,
  },
  variation: {
    type: Array,
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

const salesDataSchema = new Schema({
  unitsSold: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
});

const merchSchema = new Schema(
  {
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
      type: Array,
    },
    selectedSizes: {
      type: Array,
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
      type: Array,
    },

    sales_data: {
      type: salesDataSchema,
      default: () => ({}),
    },
    order_details: [orderDetailSchema],
  },
  { timestamps: true }
);

const Merch = mongoose.model("merch", merchSchema);

module.exports = Merch;
