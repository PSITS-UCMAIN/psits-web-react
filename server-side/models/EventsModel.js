const mongoose = require("mongoose");
const attendeeSchema = require("./AttendeesModel");

const Schema = mongoose.Schema;

const salesDataSchema = new Schema({
	campus: {
		type: String,
		enum: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
		required: true,
	},
	unitsSold: {
		type: Number,
		default: 0,
	},
	totalRevenue: {
		type: Number,
		default: 0,
	},
});

const eventSchema = new Schema({
	eventId: {
		type: Schema.Types.ObjectId,
		ref: "Merch",
		required: true,
	},
	eventName: {
		type: String,
		required: true,
	},
	eventImage: {
		type: Array,
	},
	eventDate: {
		type: Date,
		required: true,
	},
	eventDescription: {
		type: String,
		required: true,
	},
	attendees: {
		type: [attendeeSchema],
		default: [],
	},
	status: {
		type: String,
		required: true,
	},
	limit: {
		type: [
			{
				campus: {
					type: String,
					enum: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
					required: true,
				},
				limit: {
					type: Number,
					required: true,
				},
			},
		],
		default: [
			{ campus: "UC-Main", limit: 0 },
			{ campus: "UC-Banilad", limit: 0 },
			{ campus: "UC-LM", limit: 0 },
			{ campus: "UC-PT", limit: 0 },
			{ campus: "UC-CS", limit: 0 },
		],
	},
	sales_data: {
		type: [salesDataSchema],
		default: [
			{ campus: "UC-Main", unitsSold: 0, totalRevenue: 0 },
			{ campus: "UC-Banilad", unitsSold: 0, totalRevenue: 0 },
			{ campus: "UC-LM", unitsSold: 0, totalRevenue: 0 },
			{ campus: "UC-PT", unitsSold: 0, totalRevenue: 0 },
			{ campus: "UC-CS", unitsSold: 0, totalRevenue: 0 },
		],
	},
	totalUnitsSold: {
		type: Number,
		default: 0,
	},
	totalRevenueAll: {
		type: Number,
		default: 0,
	},
});

const Event = mongoose.model("event", eventSchema);

module.exports = Event;
