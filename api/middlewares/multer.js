const multer = require('multer');

const storage = multer.memoryStorage(); // Store chunks in memory before writing
const upload = multer({ storage });

module.exports = upload;