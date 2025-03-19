const express = require("express");
const Events = require("../models/EventsModel");
const Merch = require("../models/MerchModel");
const authenticateToken = require("../middlewares/authenticateToken");
const { ObjectId } = require("mongodb");
const { default: mongoose } = require("mongoose");

const router = express.Router();

// GET all events
router.get("/", authenticateToken, async (req, res) => {
  try {
    const events = await Events.find();

    return res.status(200).json({ data: events });
  } catch (error) {
    console.error(error);
  }
});

// GET all events and attendees
router.get("/attendees/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const eventId = new ObjectId(id);
    const merchData = await Merch.findById({ _id: eventId });
    const attendees = await Events.find({ eventId });
    if (attendees && merchData) {
      res.status(200).json({ data: attendees, merch_data: merchData });
    } else {
      res.status(500).json({ message: "No attendees" });
    }
  } catch (error) {
    console.error(error);
  }
});

// UPDATE Attendee isAttended property
router.put(
  "/attendance/:event_id/:id_number",
  authenticateToken,
  async (req, res) => {
    const { event_id, id_number } = req.params;

    try {
      const eventId = new ObjectId(event_id);
      const event = await Events.findOne({ eventId });

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const attendee = event.attendees.find(
        (attendee) => attendee.id_number === id_number
      );

      if (!attendee) {
        return res
          .status(404)
          .json({ message: "Attendee not found in this event" });
      }

      if (attendee.isAttended) {
        return res.status(400).json({ message: "Attendance already recorded" });
      }

      attendee.isAttended = true;
      attendee.attendDate = new Date();
      attendee.confirmedBy = req.user?.name;

      await event.save();

      res.status(200).json({
        message: "Attendance successfully recorded",
        data: attendee,
      });
    } catch (error) {
      console.error("Error marking attendance:", error);
      res
        .status(500)
        .json({ message: "An error occurred while recording attendance" });
    }
  }
);

router.get("/check-limit/:eventId", authenticateToken, async (req, res) => {
  const { eventId } = req.params;

  const event_id = new ObjectId(eventId);
  try {
    const event = await Events.findOne({ eventId: event_id });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json({ data: event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
//update-settings
router.post(
  "/update-settings/:eventId",
  authenticateToken,
  async (req, res) => {
    const { banilad, pt, lm, cs } = req.body;
    const event_id = new ObjectId(req.params.eventId);

    try {
      const response = await Events.findOneAndUpdate(
        { eventId: event_id },
        {
          $set: {
            limit: [
              { campus: "UC-Banilad", limit: banilad },
              { campus: "UC-PT", limit: pt },
              { campus: "UC-LM", limit: lm },
              { campus: "UC-CS", limit: cs },
            ],
          },
        },
        { new: true }
      );

      if (!response) {
        return res.status(404).json({ message: "Event not found" });
      }

      res
        .status(200)
        .json({ message: "Settings updated successfully", data: response });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while updating settings" });
    }
  }
);

// Get Eligible Attendees for Raffle
router.get("/raffle/:eventId", authenticateToken, async (req, res) => {
  const { eventId } = req.params;

  try {
    const event_id = new ObjectId(eventId);
    const event = await Events.findOne({ eventId: event_id });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Filter eligible attendees
    const eligibleAttendees = event.attendees.filter(
      (attendee) =>
        !attendee.raffleIsWinner &&
        !attendee.raffleIsRemoved &&
        attendee.isAttended
    );

    const winners = event.attendees.filter(
      (attendee) => attendee.raffleIsWinner
    );

    res.status(200).json({ attendees: eligibleAttendees, winners: winners });
  } catch (error) {
    console.error("Error fetching eligible attendees:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching attendees" });
  }
});

// Mark Attendee as Raffle Winner
router.post(
  "/raffle/winner/:eventId/:attendeeId",
  authenticateToken,
  async (req, res) => {
    const { eventId, attendeeId } = req.params;

    try {
      const event_id = new ObjectId(eventId);
      const event = await Events.findOne({ eventId: event_id });

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const attendee = event.attendees.find(
        (att) => att.id_number === attendeeId
      );

      if (!attendee) {
        return res
          .status(404)
          .json({ message: "Attendee not found in this event" });
      }

      if (attendee.raffleIsWinner) {
        return res
          .status(400)
          .json({ message: "Attendee is already a winner" });
      }

      attendee.raffleIsWinner = true;
      await event.save();

      res.status(200).json({
        message: "Attendee marked as raffle winner successfully",
        attendee: {
          id_number: attendee.id_number,
          name: attendee.name,
          campus: attendee.campus,
        },
      });
    } catch (error) {
      console.error("Error marking attendee as raffle winner:", error);
      res.status(500).json({
        message: "An error occurred while marking the attendee as winner",
      });
    }
  }
);

// Remove Attendee from Raffle
router.put(
  "/raffle/remove/:eventId/:attendeeId",
  authenticateToken,
  async (req, res) => {
    const { eventId, attendeeId } = req.params;

    try {
      const event_id = new ObjectId(eventId);
      const event = await Events.findOne({ eventId: event_id });

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const attendee = event.attendees.find(
        (att) => att.id_number === attendeeId
      );

      if (!attendee) {
        return res
          .status(404)
          .json({ message: "Attendee not found in this event" });
      }

      // Update attendee raffle status
      attendee.raffleIsWinner = false;
      attendee.raffleIsRemoved = true;

      await event.save();

      res.status(200).json({
        message: "Attendee removed from raffle successfully",
        attendee: {
          id_number: attendee.id_number,
          name: attendee.name,
          campus: attendee.campus,
        },
      });
    } catch (error) {
      console.error("Error removing attendee from raffle:", error);
      res.status(500).json({
        message:
          "An error occurred while removing the attendee from the raffle",
      });
    }
  }
);

router.post("/add-attendee", authenticateToken, async (req, res) => {
  try {
    const {
      id_number,
      first_name,
      middle_name,
      last_name,
      course,
      year,
      campus,
      email,
      shirt_size,
      shirt_price,
      applied,
      admin,
      merchId,
    } = req.body;

    const event = await Events.findOne({ eventId: merchId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const campusData = event.sales_data.find((s) => s.campus === campus);
    if (!campusData) {
      return res.status(400).json({ message: "Invalid campus" });
    }

    // Check if id_number already exists
    const existingAttendee = event.attendees.find(
      (attendee) => attendee.id_number === id_number
    );
    if (existingAttendee) {
      return res.status(400).json({ message: "Attendee already registered" });
    }

    campusData.unitsSold += 1;
    campusData.totalRevenue += Number.parseInt(shirt_price);

    event.totalUnitsSold += 1;
    event.totalRevenueAll += Number.parseInt(shirt_price);

    event.attendees.push({
      id_number,
      name: `${first_name} ${middle_name} ${last_name}`,
      email,
      course,
      year,
      campus,
      isAttended: false,
      shirtSize: shirt_size,
      shirtPrice: shirt_price,
      transactBy: admin,
      transactDate: new Date(),
    });

    await event.save();

    res.json({ message: "Attendee added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get-statistics/:eventId", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event_id = new ObjectId(eventId);
    const event = await Events.findOne({ eventId: event_id });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const salesData = event.sales_data;

    const totalRevenue = event.totalRevenueAll;

    const attendees = event.attendees;

    const totalAttendees = attendees.length;

    const yearLevels = [1, 2, 3, 4].reduce((acc, year) => {
      const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
      acc[`${yearWord}`] = attendees.filter(
        (attendee) => attendee.year === year
      ).length;
      return acc;
    }, {});

    const yearLevelsAttended = [1, 2, 3, 4].reduce((acc, year) => {
      const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
      acc[`${yearWord}`] = attendees.filter(
        (attendee) => attendee.year === year && attendee.isAttended
      ).length;
      return acc;
    }, {});

    const yearLevelsByCampus = [
      "UC-Main",
      "UC-Banilad",
      "UC-LM",
      "UC-PT",
      "UC-CS",
    ].map((campus) => {
      const campusWord = campus.split("-")[1];
      return {
        campus: campusWord,
        yearLevels: [1, 2, 3, 4].reduce((acc, year) => {
          const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
          acc[`${yearWord}`] = attendees.filter(
            (attendee) => attendee.year === year && attendee.campus === campus
          ).length;
          return acc;
        }, {}),
      };
    });

    const campuses = [
      "UC-Main",
      "UC-Banilad",
      "UC-LM",
      "UC-PT",
      "UC-CS",
    ].reduce((acc, campus) => {
      const campusWord = campus.split("-")[1];
      acc[`${campusWord}`] = attendees.filter(
        (attendee) => attendee.campus === campus
      ).length;
      return acc;
    }, {});
    const campusesAttended = [
      "UC-Main",
      "UC-Banilad",
      "UC-LM",
      "UC-PT",
      "UC-CS",
    ].reduce((acc, campus) => {
      const campusWord = campus.split("-")[1];
      acc[`${campusWord}`] = attendees.filter(
        (attendee) => attendee.campus === campus && attendee.isAttended
      ).length;
      return acc;
    }, {});

    const courses = ["BSIT", "BSCS"].reduce((acc, course) => {
      acc[course] = attendees.filter(
        (attendee) => attendee.course === course
      ).length;
      return acc;
    }, {});

    res.status(200).json({
      yearLevels,
      campuses,
      courses,
      totalAttendees,
      yearLevelsByCampus,
      yearLevelsAttended,
      campusesAttended,
      totalRevenue,
      salesData,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/remove-attendance", authenticateToken, async (req, res) => {
  try {
    const { id_number, merchId } = req.body;

    const event = await Events.findOne({ eventId: merchId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendeeIndex = event.attendees.findIndex(
      (a) => a.id_number === id_number
    );
    if (attendeeIndex === -1) {
      return res.status(404).json({ message: "Attendee not found" });
    }

    const { campus, shirtPrice } = event.attendees[attendeeIndex];

    const campusData = event.sales_data.find((s) => s.campus === campus);
    if (campusData) {
      campusData.unitsSold -= 1;
      campusData.totalRevenue -= Number.parseInt(shirtPrice);
    }

    event.totalUnitsSold -= 1;
    event.totalRevenueAll -= Number.parseInt(shirtPrice);

    event.attendees.splice(attendeeIndex, 1);

    await event.save();

    res.json({ message: "Attendee removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
