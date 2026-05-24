// routes/instance.routes.js
const express = require('express');
const instanceController = require('../controllers/instance.controller');
const { authenticateToken } = require('../middlewares/auth');
const router = express.Router();

router.get('/getById/:instanceId', authenticateToken, instanceController.getInstanceById); // Get instance by ID
router.put('/update/:instanceId', authenticateToken, instanceController.updateInstance); // Update instance

module.exports = router;