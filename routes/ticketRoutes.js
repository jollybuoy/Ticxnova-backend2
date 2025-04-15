const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ SLA Stats Route
router.get("/sla-stats", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const request = pool.request();
    request.input("domain", sql.NVarChar, domain);

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

// ✅ Ticket Activity Log Route
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

// ✅ Dashboard Summary Route
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
router.get("/dashboard/types", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar, domain)
      .query(`
        SELECT type, COUNT(*) as count
        FROM Tickets
        WHERE domain = @domain
        GROUP BY type
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Types fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch ticket types" });
  }
});
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

// ✅ All Tickets Route (Add this!)
router.get("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const request = pool.request();
    request.input("domain", sql.NVarChar, domain);

    const result = await request.query(`
      SELECT id, title, description, priority, status, createdBy, createdAt
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

module.exports = router;
