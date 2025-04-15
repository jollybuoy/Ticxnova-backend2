const express = require('express');
const router = express.Router();
const { poolConnect, sql, pool } = require('../config/db');
const auth = require('../middleware/auth');

// Safe domain extractor
const getDomainFromEmail = (email) => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase();
};


// CREATE TICKET
router.post("/", auth, async (req, res) => {
  await poolConnect;
  const {
    title, description, priority, type, department, assignedTo,
    category, slaLevel, dueDate, tags, attachments, isInternal
  } = req.body;

  const createdBy = req.user?.email || null;
  const domain = getDomainFromEmail(createdBy);

  try {
    const request = pool.request();
    await request
      .input("title", sql.NVarChar(255), title)
      .input("description", sql.NVarChar(sql.MAX), description || null)
      .input("priority", sql.NVarChar(50), priority)
      .input("type", sql.NVarChar(50), type)
      .input("department", sql.NVarChar(100), department)
      .input("assignedTo", sql.NVarChar(255), assignedTo)
      .input("category", sql.NVarChar(100), category)
      .input("slaLevel", sql.NVarChar(50), slaLevel)
      .input("dueDate", sql.DateTime, dueDate || null)
      .input("tags", sql.NVarChar(255), tags)
      .input("attachments", sql.NVarChar(1000), attachments)
      .input("isInternal", sql.Bit, isInternal || false)
      .input("createdBy", sql.NVarChar(255), createdBy)
      .input("domain", sql.NVarChar(255), domain)
      .query(`
        INSERT INTO Tickets 
        (title, description, priority, type, department, assignedTo, category, slaLevel, dueDate, tags, attachments, isInternal, createdBy, domain)
        VALUES 
        (@title, @description, @priority, @type, @department, @assignedTo, @category, @slaLevel, @dueDate, @tags, @attachments, @isInternal, @createdBy, @domain)
      `);

    res.status(201).json({ message: "✅ Ticket created successfully" });
  } catch (err) {
    console.error("❌ Ticket creation failed:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// GET ALL TICKETS
router.get('/', auth, async (req, res) => {
  await poolConnect;
  const userEmail = req.user?.email;
  const userDomain = getDomainFromEmail(userEmail);

  try {
    const result = await pool.request()
      .input("domain", sql.NVarChar(255), userDomain)
      .input("email", sql.NVarChar(255), userEmail)
      .query(`
        SELECT * FROM Tickets 
        WHERE domain = @domain AND (createdBy = @email OR assignedTo = @email)
        ORDER BY createdAt DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET SINGLE TICKET
router.get('/:id', auth, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const userEmail = req.user?.email;
  const userDomain = getDomainFromEmail(userEmail);

  try {
    const request = pool.request()
      .input("id", sql.Int, id)
      .input("email", sql.NVarChar(255), userEmail)
      .input("domain", sql.NVarChar(255), userDomain);

    const ticketResult = await request.query(`
      SELECT * FROM Tickets 
      WHERE id = @id AND domain = @domain 
        AND (createdBy = @email OR assignedTo = @email)
    `);

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const notesResult = await request.query(`
      SELECT * FROM Notes WHERE ticketId = @id ORDER BY createdAt DESC
    `);

    const ticket = ticketResult.recordset[0];
    ticket.notes = notesResult.recordset;

    res.json(ticket);
  } catch (err) {
    console.error('Error fetching ticket:', err);
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

// ADD NOTE TO A TICKET
router.post('/:id/notes', auth, async (req, res) => {
  await poolConnect;
  const { id } = req.params;
  const { comment, status } = req.body;
  const createdBy = req.user?.email;

  try {
    const request = pool.request()
      .input('ticketId', sql.Int, id)
      .input('comment', sql.NVarChar, comment)
      .input('status', sql.NVarChar, status)
      .input('createdBy', sql.NVarChar, createdBy);

    await request.query(`
      INSERT INTO Notes (ticketId, comment, status, createdBy)
      VALUES (@ticketId, @comment, @status, @createdBy)
    `);

    const updateRequest = pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status);

    await updateRequest.query(`UPDATE Tickets SET status = @status WHERE id = @id`);

    res.status(201).json({ message: 'Note added and status updated' });
  } catch (err) {
    console.error('Error adding note:', err);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// DELETE NOTE
router.delete('/:id/notes/:noteId', auth, async (req, res) => {
  await poolConnect;
  const { noteId } = req.params;

  try {
    await pool.request()
      .input('noteId', sql.Int, noteId)
      .query(`DELETE FROM Notes WHERE id = @noteId`);

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// DASHBOARD SUMMARY DATA
// DASHBOARD SUMMARY DATA
router.get('/dashboard/summary', auth, async (req, res) => {
  await poolConnect;
  const userEmail = req.user?.email;
  const userDomain = req.user?.domain;

  console.log("📊 Dashboard summary requested by:", userEmail, "Domain:", userDomain);

  try {
    const request = pool.request().input('domain', sql.NVarChar(255), userDomain);

    const summary = await request.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closed
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
        DATENAME(MONTH, createdAt) AS month, 
        COUNT(*) AS count
      FROM Tickets
      WHERE domain = @domain
      GROUP BY DATENAME(MONTH, createdAt), MONTH(createdAt)
      ORDER BY MONTH(createdAt)
    `);

    // ✅ Safe defaults for empty data
    res.json({
      totalTickets: summary.recordset[0] || { total: 0, open: 0, closed: 0 },
      priorities: priorities.recordset || [],
      types: types.recordset || [],
      monthlyTrends: trends.recordset || []
    });

  } catch (err) {
    console.error("❌ Dashboard summary error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});



module.exports = router;
