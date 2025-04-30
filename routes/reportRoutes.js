const express = require("express");
const router = express.Router();
const { sql, poolConnect } = require("../config/db");
const auth = require("../middleware/auth");

// GET /api/reports/tickets
router.get("/tickets", auth, async (req, res) => {
  try {
    await poolConnect;
    const request = new sql.Request();

    const { startDate, endDate, priority, department, type, status } = req.query;
    const { domain } = req.user;

    request.input("domain", sql.NVarChar, domain);

    let query = `
      SELECT
        ticketId, ticketType as type, priority, status, assignedTo, department,
        createdAt, resolvedAt, createdBy, resolvedBy
      FROM Tickets
      WHERE domain = @domain
    `;

    if (startDate) {
      request.input("startDate", sql.DateTime, new Date(startDate));
      query += " AND createdAt >= @startDate";
    }

    if (endDate) {
      request.input("endDate", sql.DateTime, new Date(endDate));
      query += " AND createdAt <= @endDate";
    }

    if (priority) {
      const values = priority.split(",");
      query += ` AND priority IN (${values.map((_, i) => `@p${i}`).join(",")})`;
      values.forEach((val, i) => request.input(`p${i}`, sql.NVarChar, val));
    }

    if (department) {
      const values = department.split(",");
      query += ` AND department IN (${values.map((_, i) => `@d${i}`).join(",")})`;
      values.forEach((val, i) => request.input(`d${i}`, sql.NVarChar, val));
    }

    if (type) {
      const values = type.split(",");
      query += ` AND ticketType IN (${values.map((_, i) => `@t${i}`).join(",")})`;
      values.forEach((val, i) => request.input(`t${i}`, sql.NVarChar, val));
    }

    if (status) {
      const values = status.split(",");
      query += ` AND status IN (${values.map((_, i) => `@s${i}`).join(",")})`;
      values.forEach((val, i) => request.input(`s${i}`, sql.NVarChar, val));
    }

    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching tickets report:", err);
    res.status(500).json({ error: "Failed to fetch tickets report" });
  }
});

module.exports = router;
