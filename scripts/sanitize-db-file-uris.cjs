const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const mongoUri = 'mongodb+srv://demontxt01_db_user1:130408go11@cluster0.hgzyvwa.mongodb.net/infernux?retryWrites=true&w=majority';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800';

async function sanitize() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB Atlas for sanitization');

  // 1. Sanitize Posts
  const postsResult = await mongoose.connection.db.collection('posts').updateMany(
    { 'media.url': { $regex: '^file://' } },
    { $set: { 'media.$[elem].url': FALLBACK_IMAGE } },
    { arrayFilters: [{ 'elem.url': { $regex: '^file://' } }] }
  );
  console.log('Posts updated:', postsResult.modifiedCount);

  // 2. Sanitize Messages
  const messagesResult = await mongoose.connection.db.collection('messages').updateMany(
    { 'attachments.url': { $regex: '^file://' } },
    { $set: { 'attachments.$[elem].url': FALLBACK_IMAGE } },
    { arrayFilters: [{ 'elem.url': { $regex: '^file://' } }] }
  );
  console.log('Messages updated:', messagesResult.modifiedCount);

  // 3. Sanitize Users avatar
  const usersResult = await mongoose.connection.db.collection('users').updateMany(
    { avatarUrl: { $regex: '^file://' } },
    { $set: { avatarUrl: undefined } }
  );
  console.log('Users avatar updated:', usersResult.modifiedCount);

  // 4. Sanitize Reels
  const reelsResult = await mongoose.connection.db.collection('reels').updateMany(
    { videoUrl: { $regex: '^file://' } },
    { $set: { videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' } }
  );
  console.log('Reels updated:', reelsResult.modifiedCount);

  await mongoose.disconnect();
  console.log('Sanitization complete!');
}

sanitize().catch(console.error);

