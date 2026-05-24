// routes/index.js
const express = require('express');
// const userRoutes = require('./user.routes');
// const authRoutes = require('./auth.routes')
// const cmsRoutes = require('./cms.routes');
// const instanceRoutes = require('./instance.routes');
// const fileRoutes = require('./file.routes')
// const campaignRoutes  =require('./campaign.routes')
// const eventRoutes = require('./event.routes')
const chatsRoutes = require('./chats.routes')
const listRoutes = require('./lists.routes')
const userRoutes = require('./user.routes')
const instanceRoutes = require('./instance.routes')
const analyticsRoutes = require('./analytics.routes')


const router = express.Router();

router.use('/chats', chatsRoutes);
router.use('/instance', instanceRoutes);
router.use('/list', listRoutes);
router.use('/user', userRoutes)
router.use('/analytics', analyticsRoutes)

module.exports = router;
