const express = require("express");
const multer = require("multer");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ✅ Multer setup
const upload = multer({
  dest: "uploads/sop/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

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

// ✅ Upload a new SOP
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { title, description, tags } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "File is required" });
  }

  try {
    const fileType = path.extname(file.originalname).substring(1); // like 'pdf'
    const fileUrl = `/uploads/sop/${file.filename}`;

    await pool.request()
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .input("tags", sql.NVarChar, tags)
      .input("fileUrl", sql.NVarChar, fileUrl)
      .input("fileType", sql.NVarChar, fileType)
      .input("domain", sql.NVarChar, domain)
      .query(`
        INSERT INTO Sops (title, description, tags, fileUrl, fileType, domain)
        VALUES (@title, @description, @tags, @fileUrl, @fileType, @domain)
      `);

    res.status(201).json({ message: "SOP uploaded successfully" });
  } catch (err) {
    console.error("❌ Failed to upload SOP:", err.message);
    res.status(500).json({ error: "Failed to upload SOP" });
  }
});

module.exports = router;
