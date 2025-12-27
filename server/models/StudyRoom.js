const mongoose = require('mongoose');

const StudyRoomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subject: { type: String, required: true },
    roomId: { type: String, required: true, unique: true },

    // 🔒 SECURITY
    isPrivate: { type: Boolean, default: false },
    passcode: { type: String, default: null }, 

    // 👥 PARTICIPANTS TRACKING
    maxParticipants: { type: Number, default: 5 },
    activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 

    duration: { type: String, default: "1 hour" },

    // 👤 CREATOR INFO
    creator: { type: String, required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 🟢 NEW: Status Tracking
    status: { type: String, default: 'active', enum: ['active', 'completed'] },
    endedAt: { type: Date },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudyRoom', StudyRoomSchema);