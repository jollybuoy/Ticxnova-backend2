const express = require("express");
const { getAccessToken } = require("../utils/msalAuth"); // We will write this
const axios = require("axios");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/documents", authMiddleware, async (req, res) => {
  try {
    const accessToken = await getAccessToken(req.user); // get access token
    const response = await axios.get("https://graph.microsoft.com/v1.0/me/drive/root/children", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const documents = response.data.value
      .filter(file => file.file) // Only real files
      .map(file => ({
        id: file.id,
        title: file.name,
        tags: [],
        description: file.name,
        updatedAt: file.lastModifiedDateTime.split("T")[0],
        owner: "Admin",
        type: file.name.split('.').pop()
      }));

    res.json(documents);
  } catch (err) {
    console.error("❌ Failed to fetch OneDrive documents:", err.message);
    res.status(500).json({ error: "Failed to fetch OneDrive documents" });
  }
});

module.exports = router;
