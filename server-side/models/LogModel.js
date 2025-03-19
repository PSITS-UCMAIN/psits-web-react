const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const logSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  admin: {
    type: String,
    required: true,
  },
  admin_id: {
    type: Schema.Types.ObjectId,
    ref: "Admin",
    required: false,
  },
  action: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: false,
  },
  target_id: {
    type: Schema.Types.ObjectId,
    required: false,
  },
  target_model: {
    type: String,
    required: false, // Specifies the collection name for the `target_id` reference
    enum: ["Admin", "Student", "Merchandise", "Order", "Merchandise Report"], // Allowed models
  },
});

const Log = mongoose.model("Log", logSchema);

module.exports = Log;
