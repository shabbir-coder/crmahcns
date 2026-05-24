const express = require('express');
const instanceController = require('../controllers/instance.controller');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth')

router.get('/qr', authenticateToken, instanceController.createQr);
router.post('/save', authenticateToken, instanceController.saveInstance);
router.post('/instanceLogin', authenticateToken, instanceController.loginInstance);

module.exports = router;