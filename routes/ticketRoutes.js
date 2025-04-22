const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Create Ticket
// ✅ Create Ticket
router.post("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const {
    title, description, priority = "P3", assignedTo, department,
    ticketType = "Incident", plannedStart, plannedEnd,
    requestedItem, justification, riskLevel, symptoms,
    dueDate
  } = req.body;

  try {
    const prefixMap = {
      Incident: "INC",
      "Service Request": "SR",
      "Change Request": "CHG",
      Problem: "PRB",
      Task: "TASK"
    };
    const prefix = prefixMap[ticketType] || "TIC";

    const idResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(id), 0) + 1 AS nextId FROM Tickets");

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
      .input("dueDate", sql.NVarChar, dueDate || null)
      .query(`
        INSERT INTO Tickets (
          ticketId, title, description, priority, status, ticketType,
          assignedTo, department, createdBy, domain,
          plannedStart, plannedEnd, requestedItem, justification,
          riskLevel, symptoms, dueDate
        ) VALUES (
          @ticketId, @title, @description, @priority, @status, @ticketType,
          @assignedTo, @department, @createdBy, @domain,
          @plannedStart, @plannedEnd, @requestedItem, @justification,
          @riskLevel, @symptoms, @dueDate
        )
      `);

    res.status(201).json({ message: "Ticket created", ticketId });
  } catch (err) {
    console.error("❌ Failed to create ticket:", err);
    res.status(500).json({ error: "Failed to create ticket", message: err.message });
  }
});



// ✅ SLA Stats
router.get("/sla-stats", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;

  try {
    const stats = {
      avgResolutionTime: 2.3,
      slaViolations: 1,
      longestOpenTicketDays: 7,
      slaCompliancePercent: 90,
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
  const { email } = req.user;

  try {
    const sampleActivity = [
      {
        user: email,
        ticketId: 101,
        action: "updated",
        status: "In Progress",
        timestamp: new Date().toISOString(),
      },
      {
        user: email,
        ticketId: 102,
        action: "created",
        priority: "High",
        timestamp: new Date().toISOString(),
      },
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
  const { domain, email } = req.user;
  const { filterBy } = req.query;

  try {
    const request = pool.request().input("domain", sql.NVarChar, domain);
    let query = `
      SELECT 
        COUNT(*) AS totalTickets,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS openTickets,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedTickets
      FROM Tickets
      WHERE domain = @domain
    `;

    if (filterBy === "mine") {
      query += " AND assignedTo = @assignedTo";
      request.input("assignedTo", sql.NVarChar, email);
    }

    const result = await request.query(query);
    const summary = result.recordset[0];

    res.json({
      total: summary.totalTickets,
      open: summary.openTickets,
      closed: summary.closedTickets,
    });
  } catch (err) {
    console.error("❌ Dashboard summary fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// ✅ Ticket Type Stats
router.get("/dashboard/types", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { filterBy } = req.query;

  try {
    const request = pool.request().input("domain", sql.NVarChar, domain);
    let query = `
      SELECT ticketType AS type, COUNT(*) as count
      FROM Tickets
      WHERE domain = @domain
    `;

    if (filterBy === "mine") {
      query += " AND assignedTo = @assignedTo";
      request.input("assignedTo", sql.NVarChar, email);
    }

    query += " GROUP BY ticketType";

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Types fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket types" });
  }
});

// ✅ Ticket Status Stats
router.get("/dashboard/status", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { filterBy } = req.query;

  try {
    const request = pool.request().input("domain", sql.NVarChar, domain);
    let query = `
      SELECT status, COUNT(*) as count
      FROM Tickets
      WHERE domain = @domain
    `;

    if (filterBy === "mine") {
      query += " AND assignedTo = @assignedTo";
      request.input("assignedTo", sql.NVarChar, email);
    }

    query += " GROUP BY status";

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Status fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket status" });
  }
});

// ✅ Ticket Priority Stats
router.get("/dashboard/priorities", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { filterBy } = req.query;

  try {
    const request = pool.request().input("domain", sql.NVarChar, domain);
    let query = `
      SELECT priority, COUNT(*) as count
      FROM Tickets
      WHERE domain = @domain
    `;

    if (filterBy === "mine") {
      query += " AND assignedTo = @assignedTo";
      request.input("assignedTo", sql.NVarChar, email);
    }

    query += " GROUP BY priority";

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Priority fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket priorities" });
  }
});

// ✅ Monthly Trends
router.get("/dashboard/monthly-trends", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { filterBy } = req.query;

  try {
    const request = pool.request().input("domain", sql.NVarChar, domain);
    let query = `
      SELECT FORMAT(createdAt, 'yyyy-MM') AS month, COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
    `;

    if (filterBy === "mine") {
      query += " AND assignedTo = @assignedTo";
      request.input("assignedTo", sql.NVarChar, email);
    }

    query += `
      GROUP BY FORMAT(createdAt, 'yyyy-MM')
      ORDER BY month
    `;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Monthly trends fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch monthly trends" });
  }
});

// ✅ Get All Tickets
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
    console.error("❌ Failed to fetch tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ✅ Get Ticket by ID (including notes)
router.get("/:id", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;
  const { id } = req.params;

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
    console.error("❌ Failed to fetch ticket by ID:", err);
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
        UPDATE Tickets
        SET status = @status,
            department = @department,
            assignedTo = @assignedTo
        WHERE id = @id
      `);

    res.json({ message: "Ticket updated successfully" });
  } catch (err) {
    console.error("Failed to update ticket:", err);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// ✅ Departments metadata
router.get("/metadata/departments", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;

  try {
    const result = await pool
      .request()
      .input("domain", sql.NVarChar, domain)
      .query("SELECT DISTINCT department FROM Users WHERE domain = @domain");

    const departments = result.recordset.map(row => row.department).filter(Boolean);
    res.json(departments);
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// ✅ Users metadata
router.get("/metadata/users", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;

  try {
    const result = await pool
      .request()
      .input("domain", sql.NVarChar, domain)
      .query("SELECT name, email, department FROM Users WHERE domain = @domain");

    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;
