// models/user.js
const mongoose = require('mongoose');

const instanceSchema = new mongoose.Schema({
  lastScannedAt: Date,
  number: Number,
  numberId: String,
  businessId: String,
  accessToken: String,
  isActive: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Instance = mongoose.model('instance', instanceSchema);

module.exports = Instance;
