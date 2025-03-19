const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const CartItem = require("./CartModel"); // Import the CartItem schema

const orderSchema = new Schema({
	id_number: {
		type: String,
		ref: "Student",
		required: true,
	},
	rfid: {
		type: String,
	},
	membership_discount: {
		type: Boolean,
	},
	student_name: {
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
	items: [CartItem.schema],
	total: {
		type: Number,
		required: true,
	},
	order_date: {
		type: Date,
		required: true,
	},
	transaction_date: {
		type: Date,
	},
	order_status: {
		type: String,
		required: true,
	},
	admin: {
		type: String,
	},
	reference_code: {
		type: String,
	},
	role: {
		type: String,
	},
});

const Orders = mongoose.model("Orders", orderSchema);
module.exports = Orders;
