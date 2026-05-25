// models/instance.model.js
const mongoose = require('mongoose');

const instanceSchema = new mongoose.Schema({
  lastScannedAt: { type: Date },
  number:        { type: Number },
  numberId:      { type: String },
  businessId:    { type: String },
  accessToken:   { type: String },
  isActive:      { type: Boolean, default: false },
  isVerified:    { type: Boolean, default: false },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});

// Indexes for CosmosDB
instanceSchema.index({ numberId: 1 }, { unique: true });
instanceSchema.index({ businessId: 1 });
instanceSchema.index({ isActive: 1 });
instanceSchema.index({ isVerified: 1 });

const Instance = mongoose.model('instance', instanceSchema);

module.exports = Instance;