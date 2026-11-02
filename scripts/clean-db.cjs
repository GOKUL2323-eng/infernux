const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const uri =
  'mongodb+srv://demontxt01_db_user1:130408go11@cluster0.hgzyvwa.mongodb.net/infernux?retryWrites=true&w=majority';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
const FALLBACK_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;

  // 1. Check users
  const users = await db.collection('users').find({
    $or: [
      { avatarUrl: { $regex: '^file:' } },
      { coverImageUrl: { $regex: '^file:' } },
      { avatarUrl: { $regex: 'ImagePicker' } },
      { avatarUrl: { $regex: 'ExperienceData' } }
    ]
  }).toArray();
  console.log(`Found ${users.length} user(s) with local device URLs.`);
  for (const u of users) {
    console.log(`  User: ${u.username}, avatar: ${u.avatarUrl}`);
    await db.collection('users').updateOne(
      { _id: u._id },
      {
        $set: {
          avatarUrl: FALLBACK_IMAGE,
          ...(u.coverImageUrl && u.coverImageUrl.includes('file:') ? { coverImageUrl: FALLBACK_IMAGE } : {})
        }
      }
    );
  }

  // 2. Check posts
  const posts = await db.collection('posts').find({
    $or: [
      { 'media.url': { $regex: '^file:' } },
      { 'media.url': { $regex: 'ImagePicker' } },
      { 'media.url': { $regex: 'ExperienceData' } }
    ]
  }).toArray();
  console.log(`Found ${posts.length} post(s) with local device URLs.`);
  for (const p of posts) {
    const updatedMedia = p.media.map((m) => {
      if (m.url && (m.url.startsWith('file:') || m.url.includes('ImagePicker') || m.url.includes('ExperienceData'))) {
        return { ...m, url: m.type === 'video' ? FALLBACK_VIDEO : FALLBACK_IMAGE };
      }
      return m;
    });
    await db.collection('posts').updateOne({ _id: p._id }, { $set: { media: updatedMedia } });
  }

  // 3. Check reels
  const reels = await db.collection('reels').find({
    $or: [
      { videoUrl: { $regex: '^file:' } },
      { videoUrl: { $regex: 'ImagePicker' } },
      { videoUrl: { $regex: 'ExperienceData' } },
      { videoUrl: { $regex: '\\.jpe?g$' } },
      { videoUrl: { $regex: '\\.png$' } },
      { thumbnailUrl: { $regex: '^file:' } },
      { thumbnailUrl: { $regex: 'ImagePicker' } }
    ]
  }).toArray();
  console.log(`Found ${reels.length} reel(s) with local or image URLs.`);
  for (const r of reels) {
    console.log(`  Reel ID: ${r._id}, videoUrl: ${r.videoUrl}`);
    await db.collection('reels').updateOne(
      { _id: r._id },
      {
        $set: {
          videoUrl: FALLBACK_VIDEO,
          thumbnailUrl: FALLBACK_IMAGE
        }
      }
    );
  }

  // 4. Check stories
  const stories = await db.collection('stories').find({
    $or: [
      { mediaUrl: { $regex: '^file:' } },
      { mediaUrl: { $regex: 'ImagePicker' } },
      { mediaUrl: { $regex: 'ExperienceData' } }
    ]
  }).toArray();
  console.log(`Found ${stories.length} story/stories with local URLs.`);
  for (const s of stories) {
    await db.collection('stories').updateOne(
      { _id: s._id },
      {
        $set: {
          mediaUrl: FALLBACK_IMAGE
        }
      }
    );
  }

  // 5. Check messages
  const messages = await db.collection('messages').find({
    $or: [
      { 'attachments.url': { $regex: '^file:' } },
      { 'attachments.url': { $regex: 'ImagePicker' } },
      { 'attachments.url': { $regex: 'ExperienceData' } }
    ]
  }).toArray();
  console.log(`Found ${messages.length} message(s) with local URLs.`);
  for (const m of messages) {
    const updated = m.attachments.map((att) => {
      if (att.url && (att.url.startsWith('file:') || att.url.includes('ImagePicker') || att.url.includes('ExperienceData'))) {
        return { ...att, url: att.type === 'video' ? FALLBACK_VIDEO : FALLBACK_IMAGE };
      }
      return att;
    });
    await db.collection('messages').updateOne({ _id: m._id }, { $set: { attachments: updated } });
  }

  console.log('MongoDB sanitation completed successfully.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error during sanitation:', err);
  process.exit(1);
});

