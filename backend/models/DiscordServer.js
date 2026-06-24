const mongoose = require('mongoose');

const discordServerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    channels: [{
        name: { type: String, required: true },
        type: { type: String, enum: ['text', 'voice'], default: 'text' },
        category: { type: String, default: 'General' }
    }],
    inviteCode: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('DiscordServer', discordServerSchema);
