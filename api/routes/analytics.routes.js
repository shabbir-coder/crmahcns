const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticateToken } = require('../middlewares/auth');

// Analytics endpoints
router.get('/template-analytics', authenticateToken, analyticsController.getTemplateAnalytics);
router.get('/phone-analytics', authenticateToken, analyticsController.getPhoneAnalytics);
router.get('/conversation-analytics', authenticateToken, analyticsController.getConversationAnalytics);

// Template management
router.get('/templates', authenticateToken, analyticsController.getMessageTemplates);
router.post('/templates', authenticateToken, analyticsController.createMessageTemplate);
router.delete('/templates/:templateName', authenticateToken, analyticsController.deleteMessageTemplate);

// Phone quality and info
router.get('/phone-quality', authenticateToken, analyticsController.getPhoneQuality);
router.get('/billing-info', authenticateToken, analyticsController.getBillingInfo);

// Profile management
router.post('/update-profile', authenticateToken, analyticsController.updateBusinessProfile);
router.post('/update-display-name', authenticateToken, analyticsController.updateDisplayName);
router.post('/update-profile-photo', authenticateToken, analyticsController.updateProfilePhoto);

module.exports = router;