const sql = require("mssql");
const db = require("../config/db");

const getReportSummary = async (req, res) => {
  try {
    console.log("🔎 Incoming report request:", req.query);
    console.log("👤 Decoded user:", req.user);

    const { startDate, endDate, assignedTo, department } = req.query;
    const domain = req.user?.domain;

    if (!domain) {
      console.error("❌ Missing domain in JWT token!");
      return res.status(400).json({ message: "Missing domain in token" });
    }

    const pool = await sql.connect(db);
    const result = await pool.request()
      .input("domain", sql.VarChar, domain)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .input("assignedTo", sql.VarChar, assignedTo || null)
      .input("department", sql.VarChar, department || null)
      .query(`
        SELECT priority, status, ticketType, createdAt, resolvedAt, slaMet
        FROM Tickets
        WHERE domain = @domain
          AND createdAt BETWEEN @startDate AND @endDate
          AND (@assignedTo IS NULL OR assignedTo = @assignedTo)
          AND (@department IS NULL OR department = @department)
      `);

    const tickets = result.recordset;

    const total = tickets.length;
    const resolvedOnTime = tickets.filter(t => t.status === 'Closed' && t.slaMet === 1).length;
    const slaPercentage = total ? Math.round((resolvedOnTime / total) * 100) : 0;

    const criticalIssues = tickets.filter(t => t.priority === 'P1').length;

    const closedTickets = tickets.filter(t => t.status === 'Closed' && t.resolvedAt && t.createdAt);
    const avgResolutionTime = closedTickets.length > 0
      ? (
        closedTickets.reduce((sum, t) => {
          const hours = (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / closedTickets.length
      ).toFixed(1)
      : 0;

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyTrends = weekdays.map((day, i) => {
      const open = tickets.filter(t => new Date(t.createdAt).getDay() === i && t.status !== 'Closed').length;
      const closed = tickets.filter(t => new Date(t.createdAt).getDay() === i && t.status === 'Closed').length;
      return { name: day, Open: open, Closed: closed };
    });

    const ticketTypes = ['Incident', 'Service Request', 'Change Request', 'Problem', 'Task'].map(type => ({
      name: type,
      value: tickets.filter(t => t.ticketType === type).length,
    }));

    res.json({
      slaPercentage,
      criticalIssues,
      avgResolutionTime,
      weeklyTrends,
      ticketTypes
    });

  } catch (err) {
    console.error("🔥 Report summary failed:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

module.exports = { getReportSummary };
