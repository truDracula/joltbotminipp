const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jolt_game');

const UserSchema = new mongoose.Schema({
  tgId: { type: String, unique: true },
  username: String,
  points: { type: Number, default: 0 },
  energy: { type: Number, default: 100 },
  referralCount: { type: Number, default: 0 },
  referredBy: String,
});

const User = mongoose.model('User', UserSchema);

app.post('/api/user/sync', async (req, res) => {
  const { tgId, username, startParam } = req.body;

  if (!tgId) {
    return res.status(400).json({ success: false, message: 'Missing tgId' });
  }

  let user = await User.findOne({ tgId });

  if (!user) {
    user = new User({
      tgId,
      username,
      referredBy: startParam || null,
    });
    await user.save();

    if (startParam) {
      await User.findOneAndUpdate(
        { tgId: startParam },
        { $inc: { points: 5000, referralCount: 1 } },
      );
    }
  }

  return res.json(user);
});

app.post('/api/ads/verify', async (req, res) => {
  const { userId, rewardId } = req.body;

  try {
    const verify = await axios.get('https://api.adsgram.ai/verify', {
      params: {
        blockId: process.env.ADSGRAM_BLOCK_ID,
        userId,
        rewardId,
        secret: process.env.ADSGRAM_SECRET,
      },
    });

    if (!verify.data?.valid) {
      return res.status(403).json({ success: false, message: 'Invalid ad claim' });
    }

    await User.findOneAndUpdate({ tgId: String(userId) }, { $set: { energy: 500 } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Ads verify error', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Jolt Backend running on port ${port}`));
