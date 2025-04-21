const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ SLA Stats
router.get("/sla-stats", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const { filterBy } = req.query;

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
  const { email } = req.user;

  try {
    const sampleActivity = [
      {
        user: email,
        ticketId: 101,
        action: "updated",
        status: "In Progress",
        timestamp: new Date().toISOString()
      },
      {
        user: email,
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

// ✅ Get All Tickets (with optional filterBy = "mine")
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

// ✅ Get Ticket By ID
router.get("/:id", authMiddleware, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const { domain } = req.user;

  try {
    const request = pool.request()
      .input("id", sql.Int, id)
      .input("domain", sql.NVarChar, domain);

    const ticketQuery = `
      SELECT * FROM Tickets WHERE id = @id AND domain = @domain
    `;
    const notesQuery = `
      SELECT * FROM TicketNotes WHERE ticketId = @id ORDER BY createdAt DESC
    `;

    const [ticketResult, notesResult] = await Promise.all([
      request.query(ticketQuery),
      request.query(notesQuery)
    ]);

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.recordset[0];
    ticket.notes = notesResult.recordset;

    res.json(ticket);
  } catch (err) {
    console.error("❌ Failed to fetch ticket by ID:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

module.exports = router;
