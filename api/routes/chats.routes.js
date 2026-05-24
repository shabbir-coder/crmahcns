const express = require('express');
const eventController = require('../controllers/event.controller');
const contactController = require('../controllers/contacts.controller');
const { authenticateInstance, authenticateToken } = require('../middlewares/auth')
const router = express.Router();
const upload = require('../middlewares/multer');
const uploadController = require('../controllers/file.controller')

router.post('/event', eventController.handleEvent);

router.get('/getContacts', authenticateToken, contactController.getContact);
router.post('/updateContact/:id', authenticateToken, contactController.updateContacts);
router.post('/saveContact', authenticateToken, contactController.saveContact);
router.delete('/deleteContact/:id', authenticateToken, contactController.deleteContact);

router.post('/getMessages', authenticateToken, contactController.getMessages);

router.post('/sendMessage', authenticateToken, contactController.sendMessage);

router.post('/markMessagesAsRead', authenticateToken, contactController.markMessagesAsRead);

router.post('/upload-chunk', upload.single('chunk'), uploadController.uploadChunk);
router.post('/merge-chunks', uploadController.mergeChunks);
router.get('/getFileUrl/:fileId', authenticateToken, uploadController.downloadAndDecryptMedia);


router.post('/assignUser', authenticateToken, contactController.assignUser);
router.get('/getAssignedUser/:contactId', authenticateToken, contactController.getAssignedUser);
router.delete('/unlinkContact/:contactId', authenticateToken, contactController.unlinkContact);
router.get('/togglePinContact/:contactId', authenticateToken, contactController.togglePinContact);



router.get('/webhookEvent', eventController.getEventWebhook);
router.post('/webhookEvent', eventController.postEventWebhook);

// router.post('/sendBulkMessage', contactController.sendBulkMessage);


module.exports = router;