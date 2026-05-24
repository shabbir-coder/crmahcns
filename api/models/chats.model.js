const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  number: { type: String },
  fromMe: {type: Boolean},
  numberId: {type: String},
  messageStatus: [{
    status: {type: String},
    time: {type: Date}
  }],  
  message: { type: String},
  type: {type: String},
  mediaUrl: {type: String},
  mediaOriginalName: {type: String},
  jpegThumbnail: {type: String},
  fileType: { type: String},
  fileSize: {type: String},
  fileLength: {type: String},
  mimetype: {type: String},
  fileId: {type: mongoose.Schema.Types.ObjectId, ref: 'file' },
  messageId: {type: String},
  timeStamp: {type: String},
  sentBy: {type: String},
  sendByName: {type: String},
  sentById: {type: mongoose.Schema.Types.ObjectId},
}, { timestamps: true }
);

  const fileSchema = new mongoose.Schema({
    url: {type: String},
    mediaName: {type: String},
    mimetype: {type: String},
    filetype: {type: String},
    caption : {type: String},
    fileSha256: {type: String},
    fileLength: {type: String},
    height: {type: String},
    width: {type: String},
    mediaKey: {type: String},
    fileEncSha256: {type: String},
    path: {type: String},
    mediaKeyTimestamp: {type: String},
    jpegThumbnail: {type: String},
    seconds: {type: String},
    contextInfo: { type: mongoose.Schema.Types.Mixed }, 
    streamingSidecar: {type: String},
  },{timestamps: true})

const Message = mongoose.model('message', chatSchema);
const File = mongoose.model('file', fileSchema)

module.exports = {Message, File};
