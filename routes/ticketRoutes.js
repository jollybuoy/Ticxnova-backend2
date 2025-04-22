const express = require("express");
const { pool, sql, poolConnect } = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Create Ticket (updated - checklist removed)
router.post("/", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain, email } = req.user;
  const {
    title,
    description,
    priority = "Medium",
    assignedTo,
    department,
    ticketType,
    plannedStart,
    plannedEnd,
    requestedItem,
    justification,
    riskLevel,
    symptoms,
    rootCause,
    dueDate
  } = req.body;

  try {
    const prefixMap = {
      "Incident": "INC",
      "Service Request": "SR",
      "Change Request": "CHG",
      "Problem": "PRB",
      "Task": "TASK"
    };
    const prefix = prefixMap[ticketType] || "TIC";

    const idResult = await pool.request()
      .query("SELECT ISNULL(MAX(id), 0) + 1 AS nextId FROM Tickets");

    const nextId = idResult.recordset[0].nextId;
    const ticketId = `${prefix}-${String(nextId).padStart(4, "0")}`;

    await pool.request()
      .input("ticketId", sql.NVarChar, ticketId)
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .input("priority", sql.NVarChar, priority)
      .input("status", sql.NVarChar, "Open")
      .input("ticketType", sql.NVarChar, ticketType)
      .input("assignedTo", sql.NVarChar, assignedTo)
      .input("department", sql.NVarChar, department)
      .input("createdBy", sql.NVarChar, email)
      .input("domain", sql.NVarChar, domain)
      .input("plannedStart", sql.NVarChar, plannedStart || null)
      .input("plannedEnd", sql.NVarChar, plannedEnd || null)
      .input("requestedItem", sql.NVarChar, requestedItem || null)
      .input("justification", sql.NVarChar, justification || null)
      .input("riskLevel", sql.NVarChar, riskLevel || null)
      .input("symptoms", sql.NVarChar, symptoms || null)
      .input("rootCause", sql.NVarChar, rootCause || null)
      .input("dueDate", sql.NVarChar, dueDate || null)
      .query(`
        INSERT INTO Tickets (
          ticketId, title, description, priority, status, ticketType,
          assignedTo, department, createdBy, domain,
          plannedStart, plannedEnd, requestedItem, justification,
          riskLevel, symptoms, rootCause, dueDate
        )
        VALUES (
          @ticketId, @title, @description, @priority, @status, @ticketType,
          @assignedTo, @department, @createdBy, @domain,
          @plannedStart, @plannedEnd, @requestedItem, @justification,
          @riskLevel, @symptoms, @rootCause, @dueDate
        )
      `);

    res.status(201).json({ message: "Ticket created", ticketId });
  } catch (err) {
    console.error("❌ Failed to create ticket:", err);
    res.status(500).json({
      error: "Failed to create ticket",
      message: err.message,
      sql: err.originalError?.info?.message || err
    });
  }
});

// ✅ Departments metadata
router.get("/metadata/departments", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;

  try {
    const result = await pool
      .request()
      .input("domain", sql.NVarChar, domain)
      .query("SELECT DISTINCT department FROM Users WHERE domain = @domain");

    const departments = result.recordset.map(row => row.department).filter(Boolean);
    res.json(departments);
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// ✅ Users metadata
router.get("/metadata/users", authMiddleware, async (req, res) => {
  await poolConnect;
  const { domain } = req.user;

  try {
    const result = await pool
      .request()
      .input("domain", sql.NVarChar, domain)
      .query("SELECT name, email, department FROM Users WHERE domain = @domain");

    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;
