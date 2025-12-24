const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // 👇 NEW: Link to a Group Chat
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    
    // 👇 LEGACY: Kept for existing 1-on-1 chats
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', MessageSchema);