const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth')

router.post('/login', userController.loginUser);
router.post('/create', authenticateToken, userController.createUser);
router.put('/update/:id', authenticateToken, userController.updateUser);
router.delete('/delete/:id', authenticateToken, userController.deleteUser);
router.get('/getall', authenticateToken, userController.getAllUsers);

module.exports = router;
