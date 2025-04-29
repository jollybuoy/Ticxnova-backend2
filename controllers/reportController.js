const sql = require('mssql');
const db = require('../config/db');

const getSimpleReport = async (req, res) => {
  try {
    const domain = req.user.domain;
    const pool = await sql.connect(db);

    const byStatus = await pool.request()
      .input('domain', sql.VarChar, domain)
      .query(`SELECT status, COUNT(*) AS count FROM Tickets WHERE domain = @domain GROUP BY status`);

    const byPriority = await pool.request()
      .input('domain', sql.VarChar, domain)
      .query(`SELECT priority, COUNT(*) AS count FROM Tickets WHERE domain = @domain GROUP BY priority`);

    const byType = await pool.request()
      .input('domain', sql.VarChar, domain)
      .query(`SELECT ticketType, COUNT(*) AS count FROM Tickets WHERE domain = @domain GROUP BY ticketType`);

    const byDepartment = await pool.request()
      .input('domain', sql.VarChar, domain)
      .query(`SELECT department, COUNT(*) AS count FROM Tickets WHERE domain = @domain GROUP BY department`);

    const monthly = await pool.request()
      .input('domain', sql.VarChar, domain)
      .query(`SELECT FORMAT(createdAt, 'yyyy-MM') AS month, COUNT(*) AS count 
              FROM Tickets 
              WHERE domain = @domain 
              GROUP BY FORMAT(createdAt, 'yyyy-MM') 
              ORDER BY month`);

    res.json({
      byStatus: byStatus.recordset,
      byPriority: byPriority.recordset,
      byType: byType.recordset,
      byDepartment: byDepartment.recordset,
      monthly: monthly.recordset
    });
  } catch (err) {
    console.error("❌ Simple report error:", err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

module.exports = {
  getSimpleReport
};
