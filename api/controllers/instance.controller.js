// controllers/instance.controller.js
const Instance = require('../models/instance.model');
const User = require('../models/users.model');

// Get instance by ID
exports.getInstanceById = async (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = await Instance.findOne({numberId: instanceId});
    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Instance not found',
      });
    }
    res.status(200).json({
      success: true,
      data: instance,
    });
  } catch (error) {
    console.error('Error fetching instance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instance',
      error: error.message,
    });
  }
};

// Update instance
exports.updateInstance = async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { number, numberId, accessToken, businessId } = req.body;

    const instance = await Instance.findOne({numberId: instanceId});

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Instance not found',
      });
    }

    const oldNumberId = instance.numberId;

    // Check if numberId is being changed and if it conflicts with existing instance
    if (numberId && numberId !== instance.numberId) {
      const existingInstance = await Instance.findOne({ numberId });
      if (existingInstance) {
        return res.status(409).json({
          success: false,
          message: 'Instance with this numberId already exists',
        });
      }
    }

    // Update fields
    if (number !== undefined) instance.number = number;
    if (numberId !== undefined) instance.numberId = numberId;
    if (accessToken !== undefined) instance.accessToken = accessToken;
    if (businessId !== undefined) instance.businessId = businessId;
    instance.lastScannedAt = new Date();
    instance.updatedAt = new Date();

    await instance.save();

    // Update numberId in User model if it changed
    if (numberId && numberId !== oldNumberId) {
      await User.updateMany(
        { numberId: oldNumberId },
        { $set: { numberId: numberId } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Instance updated successfully',
      data: instance,
    });
  } catch (error) {
    console.error('Error updating instance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update instance',
      error: error.message,
    });
  }
};