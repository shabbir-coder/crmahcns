const express = require('express');
const eventController = require('../controllers/event.controller');
const contactController = require('../controllers/contacts.controller');
const listController = require('../controllers/list.controller');
const { authenticateInstance } = require('../middlewares/auth')
const router = express.Router();


router.post('/save',  authenticateInstance, listController.createList); // Create list
router.get('/getAll', authenticateInstance, listController.getLists); // Get all lists
router.get('/getById/:listId', authenticateInstance, listController.getById); // Get all lists
router.put('/update/:listId', authenticateInstance, listController.updateList); // Update list
router.delete('/delete/:listId', authenticateInstance, listController.deleteList); // Delete list

module.exports = router;