const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Get OneDrive Documents
router.get("/documents", authMiddleware, async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1]; // Take token from frontend header

  if (!accessToken) {
    return res.status(401).json({ error: "Access token missing" });
  }

  try {
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
        tags: [], // You can later add custom tags if needed
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
