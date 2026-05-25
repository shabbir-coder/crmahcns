const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name:          { type: String, required: false },
  pushName:      { type: String, required: true },
  number:        { type: String, required: true },
  param1:        { type: String, required: false },
  param2:        { type: String, required: false },
  param3:        { type: String, required: false },
  isVerified:    { type: Boolean, default: false },
  lastMessage:   { type: String, default: '' },
  lastMessageAt: { type: Date },
  numberId:      { type: String },
}, { timestamps: true });

// Indexes for CosmosDB
contactSchema.index({ number: 1 });
contactSchema.index({ numberId: 1 });
contactSchema.index({ numberId: 1, number: 1 }, { unique: true });
contactSchema.index({ lastMessageAt: -1 });
contactSchema.index({ isVerified: 1 });

const listSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, required: false },
  type:        { type: String, default: 'Group' },
  contacts:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
  numberId:    { type: String, required: true },
}, { timestamps: true });

// Indexes for CosmosDB
listSchema.index({ numberId: 1 });
listSchema.index({ name: 1, numberId: 1 });

const ContactAgentSchema = new mongoose.Schema({
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  agentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  numberId:  { type: String },
  role:      { type: String, enum: ['agent', 'admin'], default: 'agent' },
  isPinned:  { type: Boolean, default: false },
}, { timestamps: true });

// Indexes for CosmosDB
ContactAgentSchema.index({ contactId: 1 });
ContactAgentSchema.index({ agentId: 1 });
ContactAgentSchema.index({ numberId: 1 });
ContactAgentSchema.index({ contactId: 1, agentId: 1 }, { unique: true });
ContactAgentSchema.index({ isPinned: 1, agentId: 1 });

const ContactAgent = mongoose.model('ContactAgent', ContactAgentSchema);
const Contact      = mongoose.model('Contact', contactSchema);
const List         = mongoose.model('List', listSchema);

module.exports = { List, Contact, ContactAgent };