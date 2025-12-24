const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Group vs DM logic
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },

    // 👇 NEW: Reactions Array
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String
    }]
});

module.exports = mongoose.model('Message', MessageSchema);