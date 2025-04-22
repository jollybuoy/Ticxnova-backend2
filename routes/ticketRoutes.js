const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();



// ✅ Create Ticket
router.post("/", authMiddleware, upload.single("attachment"), async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const {
    title, description, priority = "Medium", assignedTo, department, ticketType,
    plannedStart, plannedEnd, requestedItem, justification, riskLevel,
    symptoms, rootCause, dueDate
  } = req.body;
  const attachment = req.file ? req.file.filename : null;

  try {
    const prefixMap = {
      Incident: "INC", "Service Request": "SR", "Change Request": "CHG",
      Problem: "PRB", Task: "TASK"
    };
    const prefix = prefixMap[ticketType] || "TIC";
    const idResult = await pool.request().query("SELECT ISNULL(MAX(id), 0) + 1 AS nextId FROM Tickets");
    const nextId = idResult.recordset[0].nextId;
    const ticketId = `${prefix}-${String(nextId).padStart(4, "0")}`;

    await pool.request()
      .input("ticketId", sql.NVarChar, ticketId)
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .input("priority", sql.NVarChar, priority)
      .input("status", sql.NVarChar, "Open")
      .input("ticketType", sql.NVarChar, ticketType)
      .input("assignedTo", sql.NVarChar, assignedTo)
      .input("department", sql.NVarChar, department)
      .input("createdBy", sql.NVarChar, email)
      .input("domain", sql.NVarChar, domain)
      .input("plannedStart", sql.NVarChar, plannedStart || null)
      .input("plannedEnd", sql.NVarChar, plannedEnd || null)
      .input("requestedItem", sql.NVarChar, requestedItem || null)
      .input("justification", sql.NVarChar, justification || null)
      .input("riskLevel", sql.NVarChar, riskLevel || null)
      .input("symptoms", sql.NVarChar, symptoms || null)
      .input("rootCause", sql.NVarChar, rootCause || null)
      .input("dueDate", sql.NVarChar, dueDate || null)
      .input("attachment", sql.NVarChar, attachment)
      .query(`
        INSERT INTO Tickets (
          ticketId, title, description, priority, status, ticketType,
          assignedTo, department, createdBy, domain,
          plannedStart, plannedEnd, requestedItem, justification,
          riskLevel, symptoms, rootCause, dueDate, attachment
        ) VALUES (
          @ticketId, @title, @description, @priority, @status, @ticketType,
          @assignedTo, @department, @createdBy, @domain,
          @plannedStart, @plannedEnd, @requestedItem, @justification,
          @riskLevel, @symptoms, @rootCause, @dueDate, @attachment
        )
      `);

    res.status(201).json({ message: "Ticket created", ticketId });
  } catch (err) {
    console.error("❌ Failed to create ticket:", err);
    res.status(500).json({ error: "Failed to create ticket", message: err.message });
  }
});

// ✅ All Tickets
router.get("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { filterBy } = req.query;
  try {
    const request = pool.request().input("domain", sql.NVarChar, domain);
    let query = "SELECT * FROM Tickets WHERE domain = @domain";
    if (filterBy === "mine") {
      query += " AND assignedTo = @assignedTo";
      request.input("assignedTo", sql.NVarChar, email);
    }
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ✅ Ticket by ID
router.get("/:id", authMiddleware, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const { domain } = req.user;
  try {
    const ticketResult = await pool.request()
      .input("id", sql.Int, id)
      .input("domain", sql.NVarChar, domain)
      .query("SELECT * FROM Tickets WHERE id = @id AND domain = @domain");
    const ticket = ticketResult.recordset[0];
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const notesResult = await pool.request()
      .input("ticketId", sql.Int, id)
      .query("SELECT * FROM Notes WHERE ticketId = @ticketId ORDER BY createdAt DESC");
    ticket.notes = notesResult.recordset;
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// ✅ Update Ticket
router.patch("/:id", authMiddleware, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const { status, department, assignedTo } = req.body;
  try {
    await pool.request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar, status)
      .input("department", sql.NVarChar, department)
      .input("assignedTo", sql.NVarChar, assignedTo)
      .query(`
        UPDATE Tickets SET
        status = @status, department = @department, assignedTo = @assignedTo
        WHERE id = @id
      `);
    res.json({ message: "Ticket updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// ✅ Dashboard Summary
router.get("/dashboard/summary", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { filterBy } = req.query;
  try {
    const request = pool.request().input("domain", sql.NVarChar, domain);
    let query = `
      SELECT COUNT(*) AS totalTickets,
             SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS openTickets,
             SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedTickets
      FROM Tickets WHERE domain = @domain`;
    if (filterBy === "mine") {
      query += " AND assignedTo = @assignedTo";
      request.input("assignedTo", sql.NVarChar, email);
    }
    const result = await request.query(query);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// ✅ Departments metadata
router.get("/metadata/departments", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;
  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query("SELECT DISTINCT department FROM Users WHERE domain = @domain");
    const departments = result.recordset.map(row => row.department).filter(Boolean);
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// ✅ Users metadata
router.get("/metadata/users", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;
  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query("SELECT name, email, department FROM Users WHERE domain = @domain");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;
