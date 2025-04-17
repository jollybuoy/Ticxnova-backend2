const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Get Single Ticket by ID with Notes
router.get("/:id", authMiddleware, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const domain = req.user.domain;

  try {
    const ticketResult = await pool.request()
      .input("id", sql.Int, id)
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT id, ticketId, title, description, priority, status,
               department, assignedTo, createdBy, createdAt, ticketType
        FROM Tickets
        WHERE id = @id AND domain = @domain
      `);

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.recordset[0];

    // ✅ Fetch notes for this ticket
    const notesResult = await pool.request()
      .input("ticketId", sql.Int, id)
      .query(`
        SELECT id, comment, status, createdBy, createdAt
        FROM TicketNotes
        WHERE ticketId = @ticketId
        ORDER BY createdAt DESC
      `);

    ticket.notes = notesResult.recordset;

    res.json(ticket);
  } catch (err) {
    console.error("❌ Ticket fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// ✅ Submit Note for a Ticket
router.post("/:id/notes", authMiddleware, async (req, res) => {
  await poolConnect;
  const ticketId = parseInt(req.params.id);
  const domain = req.user.domain;
  const createdBy = req.user.email;
  const { comment, status } = req.body;

  console.log("📥 Incoming note:", { ticketId, comment, status, createdBy });

  if (!comment || !status) {
    return res.status(400).json({ error: "Comment and status are required." });
  }

  try {
    await pool.request()
      .input("ticketId", sql.Int, ticketId)
      .input("comment", sql.NVarChar, comment)
      .input("status", sql.NVarChar, status)
      .input("createdBy", sql.NVarChar, createdBy)
      .input("domain", sql.NVarChar, domain)
      .query(`
        INSERT INTO TicketNotes (ticketId, comment, status, createdBy, domain, createdAt)
        VALUES (@ticketId, @comment, @status, @createdBy, @domain, GETDATE())
      `);

    res.status(201).json({ message: "Note added successfully" });
  } catch (err) {
    console.error("❌ Failed to add note:", err);
    res.status(500).json({ error: "Failed to add note" });
  }
});

module.exports = router;
