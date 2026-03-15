const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Replace this with a real database.
const users = new Map();
const rewardedAds = new Set();

function getUser(tgId) {
  if (!users.has(tgId)) {
    users.set(tgId, {
      tgId,
      referredBy: null,
      referralCount: 0,
      points: 0,
      energy: 100,
    });
  }
  return users.get(tgId);
}

app.post('/api/ads/verify', async (req, res) => {
  const { userId, rewardId } = req.body;

  if (!userId || !rewardId) {
    return res.status(400).json({ success: false, message: 'Missing userId or rewardId' });
  }

  if (rewardedAds.has(rewardId)) {
    return res.status(409).json({ success: false, message: 'Reward already claimed' });
  }

  try {
    const verifyResponse = await axios.get('https://api.adsgram.ai/verify', {
      params: {
        blockId: process.env.ADSGRAM_BLOCK_ID,
        userId,
        rewardId,
        secret: process.env.ADSGRAM_SECRET,
      },
    });

    if (!verifyResponse.data?.valid) {
      return res.status(403).json({ success: false, message: 'Invalid ad claim' });
    }

    rewardedAds.add(rewardId);
    const user = getUser(String(userId));
    user.energy = 500;

    return res.json({ success: true });
  } catch (error) {
    console.error('Adsgram verify failed', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

app.post('/api/referrals/register', (req, res) => {
  const { tgId, referredBy } = req.body;

  if (!tgId) {
    return res.status(400).json({ success: false, message: 'Missing tgId' });
  }

  const user = getUser(String(tgId));

  if (referredBy && referredBy !== String(tgId) && !user.referredBy) {
    user.referredBy = String(referredBy);
    const inviter = getUser(String(referredBy));
    inviter.referralCount += 1;
    inviter.points += 5000;
  }

  return res.json({
    success: true,
    user,
  });
});

app.get('/api/users/:tgId', (req, res) => {
  const user = getUser(String(req.params.tgId));
  return res.json(user);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Ads/referral server listening on ${port}`);
});
