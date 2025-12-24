const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    // Name of the Workshop or Group
    chatName: { type: String, trim: true },
    
    // Is this a broadcast channel? (Only Admins can send)
    isAnnouncement: { type: Boolean, default: false },
    
    // If it's a workshop group, link it back (optional but useful)
    relatedWorkshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop' },

    // Members: Everyone who registered + The President
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Admins: People who can send messages in Announcement mode
    groupAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // For the Sidebar Preview
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

module.exports = mongoose.model('Chat', ChatSchema);