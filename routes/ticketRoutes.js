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

    // Dummy stats - Replace with real logic as needed
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

// ✅ Missing export added here:
module.exports = router;
