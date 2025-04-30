router.get("/tickets", auth, async (req, res) => {
  const { startDate, endDate, priority, department, type, status } = req.query;
  const domain = req.user.domain;

  const query = `
    SELECT ticketId, ticketType as type, priority, status, assignedTo, department,
           createdAt, resolvedAt, createdBy, resolvedBy
    FROM Tickets
    WHERE domain = @domain
      ${startDate ? "AND createdAt >= @startDate" : ""}
      ${endDate ? "AND createdAt <= @endDate" : ""}
      ${priority ? `AND priority IN (${priority.split(",").map((_, i) => `@p${i}`).join(",")})` : ""}
      ${department ? `AND department IN (${department.split(",").map((_, i) => `@d${i}`).join(",")})` : ""}
      ${type ? `AND ticketType IN (${type.split(",").map((_, i) => `@t${i}`).join(",")})` : ""}
      ${status ? `AND status IN (${status.split(",").map((_, i) => `@s${i}`).join(",")})` : ""}
  `;

  // build parameters with mssql
});
