const sql = require("mssql");
const db = require("../config/db"); // Adjust path to your DB config

const getReportSummary = async (req, res) => {
  try {
    const { startDate, endDate, assignedTo, department } = req.query;
    const domain = req.user.domain;

    let conditions = `WHERE domain = @domain AND createdAt BETWEEN @startDate AND @endDate`;
    if (assignedTo) conditions += ` AND assignedTo = @assignedTo`;
    if (department) conditions += ` AND department = @department`;

    const pool = await sql.connect(db);

    // Fetch all relevant tickets
    const tickets = await pool.request()
      .input("domain", sql.VarChar, domain)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .input("assignedTo", sql.VarChar, assignedTo || null)
      .input("department", sql.VarChar, department || null)
      .query(`SELECT priority, status, ticketType, createdAt, resolvedAt, slaMet
              FROM Tickets ${conditions}`);

    const rows = tickets.recordset;
    const total = rows.length;

    const resolvedOnTime = rows.filter(t => t.status === 'Closed' && t.slaMet).length;
    const slaPercentage = total ? Math.round((resolvedOnTime / total) * 100) : 0;

    const criticalIssues = rows.filter(t => t.priority === 'P1').length;

    const closedTickets = rows.filter(t => t.status === 'Closed' && t.resolvedAt);
    const avgResolutionTime = closedTickets.length > 0
      ? (
        closedTickets.reduce((sum, t) => {
          const hours = (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / closedTickets.length
      ).toFixed(1)
      : 0;

    const weeklyTrends = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
      const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
      const open = rows.filter(t => new Date(t.createdAt).getDay() === dayIndex && t.status !== 'Closed').length;
      const closed = rows.filter(t => new Date(t.createdAt).getDay() === dayIndex && t.status === 'Closed').length;
      return { name: day, Open: open, Closed: closed };
    });

    const typeNames = ['Incident', 'Service Request', 'Change Request', 'Problem', 'Task'];
    const ticketTypes = typeNames.map(type => ({
      name: type,
      value: rows.filter(t => t.ticketType === type).length,
    }));

    res.json({
      slaPercentage,
      criticalIssues,
      avgResolutionTime,
      weeklyTrends,
      ticketTypes,
    });
  } catch (error) {
    console.error("Report summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getReportSummary };
