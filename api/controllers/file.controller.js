const fs = require('fs');
const path = require('path');

const axios = require('axios');
const crypto = require('crypto');
const { File , Message} = require('../models/chats.model');

const { decryptMedia } = require('@open-wa/wa-decrypt');
const mime = require('mime-types');

exports.uploadChunk = (req, res) => {
    const { index, totalChunks, fileName } = req.body;
    const chunk = req.file;

    if (!chunk) {
        return res.status(400).json({ message: 'No chunk uploaded.' });
    }

    const tempDir = path.join(__dirname, '../../uploads/temp', fileName);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const chunkPath = path.join(tempDir, `chunk-${index}`);
    fs.writeFileSync(chunkPath, chunk.buffer);

    res.json({ message: `Chunk ${index} uploaded successfully` });
};

exports.mergeChunks = (req, res) => {
    const { fileName } = req.body;
    const tempDir = path.join(__dirname, '../../uploads/temp', fileName);
    
    if (!fs.existsSync(tempDir)) {
        return res.status(400).json({ message: 'Chunks not found.' });
    }
    
    const fileExt = path.extname(fileName);
    const baseName = path.basename(fileName, fileExt);
    const safeBaseName = baseName.replace(/\s+/g, '');
    const uniqueName = `${safeBaseName}-${Date.now()}${fileExt}`;
    const finalFilePath = path.join(__dirname, "../../uploads", uniqueName);

    const chunkFiles = fs.readdirSync(tempDir).sort((a, b) => {
        return parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]);
    });

    const writeStream = fs.createWriteStream(finalFilePath);
    chunkFiles.forEach(chunk => {
        const chunkPath = path.join(tempDir, chunk);
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
        fs.unlinkSync(chunkPath);
    });

    writeStream.end();
    fs.rmdirSync(tempDir);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/wp/uploads/${uniqueName}`;

    res.json({ message: 'File merged successfully', filePath: fileUrl });
};

exports.downloadAndDecryptMedia = async (req, res) => {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }
        
    const { url, mediaKey, fileEncSha256, mimetype , filetype, fileLength} = file;
    
    const message = {deprecatedMms3Url: url, mediaKey, filehash: fileEncSha256, mimetype, type: filetype, size: fileLength}
    if (!message.mimetype) return;

    try {
        const filename = `${file._id}.${mime.extension(message.mimetype)}`;
        const mediaData = await decryptMedia(message);
        
        const uploadDir = path.join(__dirname, '../../uploads/downloads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true }); // Create directory if it doesn't exist
        }
        const savePath = path.join(uploadDir, filename);

        fs.writeFileSync(savePath, mediaData);
        
        // Step 5: Return URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/wp/uploads/downloads/${filename}`; // Corrected variable name
        
        const mediaMessage = await Message.findOne({fileId})
        mediaMessage.mediaUrl = fileUrl;
        await mediaMessage.save()
        res.json({ fileId, fileUrl });
    } catch (error) {
        console.error('Error processing message:', error);
    }
};