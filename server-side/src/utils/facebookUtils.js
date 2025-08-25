const finalizeFacebookData = (data) => {
  return data.map((post) => {
    // Extract the attachment
    const attachment = post.attachments[0];

    // Initialize the updatedData object
    const updatedData = {
      id: post.id, // Include the post id
      created_time: post.created_time, // Include the post creation time
      reactions_count: post.reactions_count, // Include reactions count
      comments_count: post.comments_count, // Include comments count
      description: attachment?.description || attachment?.title || "",
      imageSources: [],
      type: attachment?.type,
      url: attachment?.url,
    };

    // Handle different types
    switch (attachment?.type) {
      case "photo":
      case "profile_media":
        updatedData.imageSources = [attachment.media.image.src];
        break;
      case "album":
        updatedData.imageSources = attachment.subattachments.data.map(
          (sub) => sub.media.image.src
        );
        break;
      case "video_inline":
        // Only get the image src for videos
        if (attachment.media.image) {
          updatedData.imageSources = [attachment.media.image.src];
        }
        break;
      default:
        // Handle other types if needed
        break;
    }

    return updatedData;
  });
};

module.exports = { finalizeFacebookData };
