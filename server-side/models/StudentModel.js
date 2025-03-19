const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const CartItem = require("./CartModel"); // Import the CartItem schema

const studentSchema = new Schema({
  id_number: {
    type: String,
    unique: true,
  },
  rfid: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  first_name: {
    type: String,
    required: true,
  },
  middle_name: {
    type: String,
  },
  last_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
  },
  membership: {
    type: String,
  },
  applied: {
    type: String,
  },
  campus: {
    type: String,
  },
  deletedBy: {
    type: String,
  },
  deletedDate: {
    type: String,
  },
  renew: {
    type: String,
  },
  renewedOn: {
    type: String,
  },
  role: {
    type: String,
  },
  isRequest: {
    type: Boolean,
  },
  adminRequest: {
    type: String,
  },

  cart: [CartItem.schema],
});

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
