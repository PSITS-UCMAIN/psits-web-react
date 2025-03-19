const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const attendeeSchema = new Schema({
  id_number: {
    type: String,
    required: true,
  },
  name: {
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
  campus: {
    type: String,
    required: true,
  },
  isAttended: {
    type: Boolean,
    default: false,
  },
  attendDate: {
    type: Date,
  },
  confirmedBy: {
    type: String,
  },
  shirtSize: {
    type: String,
  },
  shirtPrice: {
    type: Number,
  },
  raffleIsRemoved: {
    type: Boolean,
    default: false,
  },
  raffleIsWinner: {
    type: Boolean,
    default: false,
  },
  transactBy: {
    type: String,
  },
  transactDate: {
    type: Date,
  },
});

module.exports = attendeeSchema;
