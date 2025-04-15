const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

// 📊 Dashboard Summary
router.get("/dashboard/summary", authMiddleware, async (req, res) => {
  await poolConnect;
  const userDomain = req.user?.domain;

  if (!userDomain) {
    return res.status(401).json({ error: "Unauthorized - No domain in user object" });
  }

  try {
    const request = pool.request();
    request.input("domain", sql.NVarChar, userDomain);

    const totalQuery = await request.query(`
      SELECT 
        COUNT(*) AS totalTickets,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS openTickets,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedTickets
      FROM Tickets
      WHERE domain = @domain
    `);

    const priorityQuery = await request.query(`
      SELECT priority, COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
      GROUP BY priority
    `);

    const typeQuery = await request.query(`
      SELECT type, COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
      GROUP BY type
    `);

    const monthlyQuery = await request.query(`
      SELECT 
        FORMAT(createdAt, 'yyyy-MM') AS month,
        COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
      GROUP BY FORMAT(createdAt, 'yyyy-MM')
      ORDER BY month ASC
    `);

    res.json({
      totals: totalQuery.recordset[0],
      priorities: priorityQuery.recordset,
      types: typeQuery.recordset,
      monthlyTrends: monthlyQuery.recordset,
    });

  } catch (err) {
    console.error("❌ Dashboard summary error:", err.message);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});


module.exports = router;
