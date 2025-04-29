const express = require('express');
const router = express.Router();
const { getSimpleReport } = require('../controllers/reportController');
const auth = require('../middleware/auth');

// New simplified report route
router.get('/simple', auth, getSimpleReport);

module.exports = router;
