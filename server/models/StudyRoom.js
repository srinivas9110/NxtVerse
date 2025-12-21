const mongoose = require('mongoose');

const StudyRoomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subject: { type: String, required: true },
    roomId: { type: String, required: true, unique: true },

    // 🔒 SECURITY
    isPrivate: { type: Boolean, default: false },
    passcode: { type: String, default: null }, // Simple 4-digit code

    // 👥 PARTICIPANTS TRACKING
    maxParticipants: { type: Number, default: 5 },
    activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track distinct users

    duration: { type: String, default: "1 hour" },

    // 👤 CREATOR INFO
    creator: { type: String, required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudyRoom', StudyRoomSchema);