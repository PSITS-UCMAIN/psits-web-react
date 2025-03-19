const express = require("express");
const axios = require("axios");
const { finalizeFacebookData } = require("../utils/facebookUtils");
require("dotenv").config();
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

// TODO: improve data fetched and ui
// GET 5 recent posts
router.get("/", async (req, res) => {
  const page_id = process.env.PSITS_PAGE_ID;
  const access_token = process.env.PSITS_ACCESS_TOKEN;

  try {
    // Fetch the feed data with created_time, reactions, and comments
    const feed = await axios.get(
      `https://graph.facebook.com/v20.0/${page_id}/feed?access_token=${access_token}&fields=id,created_time,reactions.summary(total_count),comments.summary(total_count)`
    );

    const feedData = feed.data;

    if (!feedData || !feedData.data) {
      // console.log("No feed data found");
      return res.status(404).json({ message: "No feed data found" });
    }

    // Extract the first five posts' details
    const recentFeedData = feedData.data.slice(0, 5).map((post) => ({
      id: post.id,
      created_time: post.created_time,
      reactions_count: post.reactions?.summary.total_count || 0,
      comments_count: post.comments?.summary.total_count || 0,
    }));

    // Fetch attachment data for each post
    const attachmentsPromises = recentFeedData.map(async (post) => {
      try {
        const attachments = await axios.get(
          `https://graph.facebook.com/v20.0/${post.id}/attachments?access_token=${access_token}`
        );
        return {
          ...post, // Include id, created_time, reactions_count, comments_count
          attachments: attachments.data ? attachments.data.data : [],
        };
      } catch (err) {
        console.error(
          `Error fetching attachments for post ${post.id}:`,
          err.message
        );
        return {
          ...post, // Include id, created_time, reactions_count, comments_count
          attachments: [],
        };
      }
    });

    // Wait for all attachment data to be fetched
    const postsWithAttachments = await Promise.all(attachmentsPromises);

    // Finalize the response data
    const finalizedResponse = finalizeFacebookData(postsWithAttachments);

    // Send the response
    res.status(200).json(finalizedResponse);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
