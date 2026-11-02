const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const mongoUri = 'mongodb+srv://demontxt01_db_user1:130408go11@cluster0.hgzyvwa.mongodb.net/infernux?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(mongoUri);
  const users = await mongoose.connection.db.collection('users').find({
    $or: [
      { avatarUrl: { $regex: 'file://' } },
      { coverImageUrl: { $regex: 'file://' } }
    ]
  }).toArray();
  console.log('Users with file:// avatar:', users.map(u => ({ id: u._id, username: u.username, avatarUrl: u.avatarUrl })));

  const reels = await mongoose.connection.db.collection('reels').find({
    $or: [
      { videoUrl: { $regex: 'file://' } },
      { thumbnailUrl: { $regex: 'file://' } },
      { videoUrl: '' },
      { videoUrl: null }
    ]
  }).toArray();
  console.log('Reels with invalid videoUrl:', reels.map(r => ({ id: r._id, videoUrl: r.videoUrl })));

  const msg = await mongoose.connection.db.collection('messages').findOne({ _id: new mongoose.Types.ObjectId('6ae5ef75cca7448b73f0ae45') });
  console.log('Message:', JSON.stringify(msg));

  await mongoose.disconnect();
}
run().catch(console.error);
