const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const adminSchema = new Schema({
  id_number: {
    type: String,
    unique: true,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
    require: true,
  },
  name: {
    type: String,
    require: true,
  },
  course: {
    type: String,
    require: true,
  },
  year: {
    type: String,
    require: true,
  },
  position: {
    type: String,
    require: true,
  },
  status: {
    type: String,
  },
  campus: {
    type: String,
  },
});

const Admin = mongoose.model("admin", adminSchema);

module.exports = Admin;
