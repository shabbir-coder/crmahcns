// db.js
const mongoose = require('mongoose');

// Import all models for index sync
const { Message, File } = require('../api/models/chats.model');
const { Contact, List, ContactAgent } = require('../api/models/contact.model');
const Instance = require('../api/models/instance.model');
const User = require('../api/models/users.model');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    };

    const conn = await mongoose.connect(
      process.env.MONGODB_URI,
      options
    );

    // Sync indexes after connection
    await syncAllIndexes();
  } catch (error) {
    console.error('❌ CosmosDB connection error:', error.message);
    process.exit(1);
  }
};

async function syncAllIndexes() {
  const models = [
    { name: 'Message',      model: Message },
    { name: 'File',         model: File },
    { name: 'Contact',      model: Contact },
    { name: 'List',         model: List },
    { name: 'ContactAgent', model: ContactAgent },
    { name: 'Instance',     model: Instance },
    { name: 'User',         model: User },
  ];

  console.log('🔄 Starting index synchronization for all models...');
  const results = [];

  for (const { name, model } of models) {
    try {
      await model.syncIndexes();
      console.log(`✅ ${name}: Indexes synced successfully`);
      results.push({ model: name, status: 'success' });
    } catch (error) {
      console.error(`❌ ${name}: Index sync failed -`, error.message);
      results.push({ model: name, status: 'failed', error: error.message });
    }
  }

  const successful = results.filter(r => r.status === 'success').length;
  const failed     = results.filter(r => r.status === 'failed').length;

  if (failed > 0) {
    results
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`   - ${r.model}: ${r.error}`));
  }

  return results;
}

module.exports = { connectDB, syncAllIndexes };