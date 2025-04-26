// backend/routes/sopRoutes.js
const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Fetch all SOPs
router.get("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT id, title, description, tags, fileUrl, fileType, updatedAt
        FROM Sops
        WHERE domain = @domain
        ORDER BY updatedAt DESC
      `);

    // If tags are stored as comma-separated, convert to array
    const formattedResult = result.recordset.map(sop => ({
      ...sop,
      tags: sop.tags ? sop.tags.split(",").map(tag => tag.trim()) : []
    }));

    res.json(formattedResult);
  } catch (err) {
    console.error("❌ Failed to fetch SOPs:", err.message);
    res.status(500).json({ error: "Failed to fetch SOPs" });
  }
});

module.exports = router;
