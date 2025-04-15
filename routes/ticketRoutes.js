const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// 🎫 Create Ticket
router.post("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const {
    title, description, priority, type,
    department, assignedTo, category,
    slaLevel, dueDate, tags, isInternal
  } = req.body;

  const createdBy = req.user.email;
  const domain = req.user.domain;

  try {
    const request = pool.request();
    await request
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .input("priority", sql.NVarChar, priority)
      .input("status", sql.NVarChar, "Open")
      .input("createdBy", sql.NVarChar, createdBy)
      .input("type", sql.NVarChar, type || null)
      .input("department", sql.NVarChar, department || null)
      .input("assignedTo", sql.NVarChar, assignedTo || null)
      .input("category", sql.NVarChar, category || null)
      .input("slaLevel", sql.NVarChar, slaLevel || null)
      .input("dueDate", sql.DateTime, dueDate || null)
      .input("tags", sql.NVarChar, tags || null)
      .input("isInternal", sql.Bit, isInternal || false)
      .input("domain", sql.NVarChar, domain)
      .query(`
        INSERT INTO Tickets (
          title, description, priority, status,
          createdBy, createdAt, type, department,
          assignedTo, category, slaLevel, dueDate,
          tags, isInternal, domain
        ) VALUES (
          @title, @description, @priority, @status,
          @createdBy, GETDATE(), @type, @department,
          @assignedTo, @category, @slaLevel, @dueDate,
          @tags, @isInternal, @domain
        )
      `);

    res.status(201).json({ message: "Ticket created successfully" });
  } catch (err) {
    console.error("❌ Ticket creation failed:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// 📋 Get All Tickets for User's Domain
router.get("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const domain = req.user.domain;

  try {
    const request = pool.request();
    request.input("domain", sql.NVarChar, domain);

    const result = await request.query(`
      SELECT * FROM Tickets WHERE domain = @domain ORDER BY createdAt DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Fetch tickets failed:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// 🧾 Get Ticket Details by ID
router.get("/:id", authMiddleware, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const domain = req.user.domain;

  try {
    const request = pool.request();
    request.input("id", sql.Int, id);
    request.input("domain", sql.NVarChar, domain);

    const result = await request.query(`
      SELECT * FROM Tickets WHERE id = @id AND domain = @domain
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("❌ Ticket fetch error:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// 📊 Dashboard Summary Route
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
