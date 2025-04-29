const express = require('express');
const router = express.Router();
const { getReportSummary } = require('../controllers/reportController');
const authenticateToken = require('../middleware/auth');

router.get('/summary', authenticateToken, getReportSummary);

module.exports = router;

