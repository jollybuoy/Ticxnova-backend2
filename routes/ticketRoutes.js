const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

// 📊 Dashboard Summary
router.get("/dashboard/summary", auth, async (req, res) => {
  await poolConnect;
  const userDomain = req.user?.domain;

  if (!userDomain) {
    return res.status(401).json({ error: "Unauthorized - No domain in token" });
  }

  try {
    const request = pool.request().input("domain", sql.NVarChar, userDomain);

    const summary = await request.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) AS open,
        COUNT(CASE WHEN status = 'Closed' THEN 1 END) AS closed
      FROM Tickets
      WHERE domain = @domain
    `);

    const priorities = await request.query(`
      SELECT priority, COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
      GROUP BY priority
    `);

    const types = await request.query(`
      SELECT type, COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
      GROUP BY type
    `);

    const trends = await request.query(`
      SELECT 
        FORMAT(createdAt, 'yyyy-MM') AS month,
        COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
      GROUP BY FORMAT(createdAt, 'yyyy-MM')
      ORDER BY month
    `);

    res.json({
      totalTickets: summary.recordset[0] || { total: 0, open: 0, closed: 0 },
      priorities: priorities.recordset || [],
      types: types.recordset || [],
      monthlyTrends: trends.recordset || []
    });
  } catch (err) {
    console.error("❌ Dashboard fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

module.exports = router;
