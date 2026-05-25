const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  number:            { type: String },
  fromMe:            { type: Boolean },
  numberId:          { type: String },
  messageStatus: [{
    status: { type: String },
    time:   { type: Date },
  }],
  message:           { type: String },
  type:              { type: String },
  mediaUrl:          { type: String },
  mediaOriginalName: { type: String },
  jpegThumbnail:     { type: String },
  fileType:          { type: String },
  fileSize:          { type: String },
  fileLength:        { type: String },
  mimetype:          { type: String },
  fileId:            { type: mongoose.Schema.Types.ObjectId, ref: 'file' },
  messageId:         { type: String },
  timeStamp:         { type: String },
  sentBy:            { type: String },
  sendByName:        { type: String },
  sentById:          { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

// Indexes for CosmosDB
chatSchema.index({ number: 1 });
chatSchema.index({ numberId: 1 });
chatSchema.index({ messageId: 1 });
chatSchema.index({ numberId: 1, number: 1 });
chatSchema.index({ createdAt: -1 });

const fileSchema = new mongoose.Schema({
  url:                { type: String },
  mediaName:          { type: String },
  mimetype:           { type: String },
  filetype:           { type: String },
  caption:            { type: String },
  fileSha256:         { type: String },
  fileLength:         { type: String },
  height:             { type: String },
  width:              { type: String },
  mediaKey:           { type: String },
  fileEncSha256:      { type: String },
  path:               { type: String },
  mediaKeyTimestamp:  { type: String },
  jpegThumbnail:      { type: String },
  seconds:            { type: String },
  contextInfo:        { type: mongoose.Schema.Types.Mixed },
  streamingSidecar:   { type: String },
}, { timestamps: true });

// Indexes for CosmosDB
fileSchema.index({ mediaName: 1 });
fileSchema.index({ createdAt: -1 });

const Message = mongoose.model('message', chatSchema);
const File    = mongoose.model('file', fileSchema);

module.exports = { Message, File };