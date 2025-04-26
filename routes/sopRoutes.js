const express = require("express");
const multer = require("multer");
const path = require("path");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Setup Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/sops"); // store in uploads/sops/ folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// ✅ GET all SOP documents
router.get("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;

  try {
    const result = await pool
      .request()
      .input("domain", sql.NVarChar, domain)
      .query("SELECT * FROM SOPDocuments WHERE domain = @domain ORDER BY uploadedAt DESC");

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Failed to fetch SOP documents:", err.message);
    res.status(500).json({ error: "Failed to fetch SOP documents" });
  }
});

// ✅ POST upload new SOP document
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { title, description } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    await pool.request()
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .input("filePath", sql.NVarChar, file.filename)
      .input("uploadedBy", sql.NVarChar, email)
      .input("domain", sql.NVarChar, domain)
      .query(`
        INSERT INTO SOPDocuments (title, description, filePath, uploadedBy, domain)
        VALUES (@title, @description, @filePath, @uploadedBy, @domain)
      `);

    res.status(201).json({ message: "SOP uploaded successfully" });
  } catch (err) {
    console.error("❌ Failed to upload SOP document:", err.message);
    res.status(500).json({ error: "Failed to upload SOP document" });
  }
});

module.exports = router;
