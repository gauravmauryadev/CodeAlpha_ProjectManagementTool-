const express = require('express');
const router = express.Router();
const { AccessToken } = require('livekit-server-sdk');
const auth = require('../middleware/auth');

// @route   POST /api/livekit/token
// @desc    Generate a token for LiveKit room
// @access  Private
router.post('/token', auth, async (req, res) => {
  try {
    const { roomName } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ message: 'LiveKit API keys not configured on server' });
    }

    const participantName = req.user.name || 'User';
    
    // Create a new AccessToken
    const at = new AccessToken(apiKey, apiSecret, {
      identity: req.user._id.toString(),
      name: participantName,
    });
    
    // Add grants for the user
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
