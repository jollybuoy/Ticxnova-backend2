const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ SLA Stats
router.get("/sla-stats", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const stats = {
      avgResolutionTime: 2.3,
      slaViolations: 1,
      longestOpenTicketDays: 7,
      slaCompliancePercent: 90
    };
    res.json(stats);
  } catch (err) {
    console.error("❌ SLA stats fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch SLA stats" });
  }
});

// ✅ Ticket Activity Log
router.get("/activity-log", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const sampleActivity = [
      {
        user: req.user.email,
        ticketId: 101,
        action: "updated",
        status: "In Progress",
        timestamp: new Date().toISOString()
      },
      {
        user: req.user.email,
        ticketId: 102,
        action: "created",
        priority: "High",
        timestamp: new Date().toISOString()
      }
    ];
    res.json(sampleActivity);
  } catch (err) {
    console.error("❌ Activity log fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
});

// ✅ Dashboard Summary
router.get("/dashboard/summary", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const request = pool.request();
    request.input("domain", sql.NVarChar, domain);

    const result = await request.query(`
      SELECT 
        COUNT(*) AS totalTickets,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS openTickets,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedTickets
      FROM Tickets
      WHERE domain = @domain
    `);

    const summary = result.recordset[0];

    res.json({
      total: summary.totalTickets,
      open: summary.openTickets,
      closed: summary.closedTickets
    });
  } catch (err) {
    console.error("❌ Dashboard summary fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// ✅ Ticket Type Stats
router.get("/dashboard/types", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT ticketType AS type, COUNT(*) as count
        FROM Tickets
        WHERE domain = @domain
        GROUP BY ticketType
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Types fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket types" });
  }
});

// ✅ Ticket Status Stats
router.get("/dashboard/status", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT status, COUNT(*) as count
        FROM Tickets
        WHERE domain = @domain
        GROUP BY status
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Status fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket status" });
  }
});

// ✅ Ticket Priority Stats
router.get("/dashboard/priorities", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT priority, COUNT(*) as count
        FROM Tickets
        WHERE domain = @domain
        GROUP BY priority
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Priority fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket priorities" });
  }
});

// ✅ Monthly Trends
router.get("/dashboard/monthly-trends", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT FORMAT(createdAt, 'yyyy-MM') AS month, COUNT(*) AS count
        FROM Tickets
        WHERE domain = @domain
        GROUP BY FORMAT(createdAt, 'yyyy-MM')
        ORDER BY month
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Monthly trends fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch monthly trends" });
  }
});

// ✅ Get All Tickets
router.get("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT id, ticketId, title, description, priority, status,
               createdBy, createdAt, department, assignedTo, ticketType
        FROM Tickets
        WHERE domain = @domain
        ORDER BY createdAt DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ All tickets fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ✅ Get Ticket by ID (Includes Notes from dbo.Notes)
router.get("/:id", authMiddleware, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const domain = req.user.domain;

  try {
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT id, ticketId, title, description, priority, status,
               department, assignedTo, createdBy, createdAt, attachments, ticketType
        FROM Tickets
        WHERE id = @id AND domain = @domain
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = result.recordset[0];

    // ✅ Fetch notes from dbo.Notes
    const notesResult = await pool.request()
      .input("ticketId", sql.Int, ticket.id)
      .query(`
        SELECT id, comment, status, createdBy, createdAt
        FROM Notes
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

// ✅ Create Ticket
router.post("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;
  const createdBy = req.user.email;
  const {
    title,
    description,
    priority,
    department,
    assignedTo,
    dueDate,
    isInternal,
    ticketType,
    attachments
  } = req.body;

  try {
    const request = pool.request();
    request.input("domain", sql.NVarChar, domain);
    request.input("title", sql.NVarChar, title);
    request.input("description", sql.NVarChar, description);
    request.input("priority", sql.NVarChar, priority);
    request.input("department", sql.NVarChar, department);
    request.input("assignedTo", sql.NVarChar, assignedTo);
    request.input("dueDate", sql.DateTime, dueDate || null);
    request.input("isInternal", sql.Bit, isInternal || false);
    request.input("createdBy", sql.NVarChar, createdBy);
    request.input("ticketType", sql.NVarChar, ticketType);
    request.input("attachments", sql.NVarChar, attachments || "");

    const insertResult = await request.query(`
      INSERT INTO Tickets (title, description, priority, department, assignedTo, dueDate, isInternal, createdBy, domain, ticketType, attachments)
      OUTPUT INSERTED.id
      VALUES (@title, @description, @priority, @department, @assignedTo, @dueDate, @isInternal, @createdBy, @domain, @ticketType, @attachments)
    `);

    const insertedId = insertResult.recordset[0].id;

    const prefixMap = {
      "Incident": "INC",
      "Service Request": "SR",
      "Change Request": "CHG",
      "Problem": "PRB",
      "Task": "TASK"
    };
    const prefix = prefixMap[ticketType] || "TCK";
    const ticketId = `${prefix}-${insertedId}`;

    const updateRequest = pool.request();
    updateRequest.input("ticketId", sql.NVarChar, ticketId);
    updateRequest.input("id", sql.Int, insertedId);
    await updateRequest.query(`
      UPDATE Tickets SET ticketId = @ticketId WHERE id = @id
    `);

    res.status(201).json({ success: true, ticketId });
  } catch (err) {
    console.error("❌ Ticket creation failed:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// ✅ Add Note to Ticket (dbo.Notes)
router.post("/:id/notes", authMiddleware, async (req, res) => {
  await poolConnect;
  const ticketId = parseInt(req.params.id);
  const { comment, status } = req.body;
  const domain = req.user.domain;
  const createdBy = req.user.email;

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
        INSERT INTO Notes (ticketId, comment, status, createdBy, domain, createdAt)
        VALUES (@ticketId, @comment, @status, @createdBy, @domain, GETDATE())
      `);

    res.status(201).json({ message: "Note added successfully" });
  } catch (err) {
    console.error("❌ Failed to add note:", err);
    res.status(500).json({ error: "Failed to add note" });
  }
});

module.exports = router;
