const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
    message: { type: String, required: true },

    // 🏷️ CATEGORY (For the Tabs: 'Hackathons', 'Academic', 'Clubs')
    category: {
        type: String,
        default: 'General',
        enum: ['General', 'Hackathon', 'Academic', 'Club', 'Placement']
    },

    // 🎯 TARGET AUDIENCE (Filter: 'All', 'B.Sc', 'B.Tech', etc.)
    targetAudience: {
        type: [String],
        default: ['All']
    },

    // 🚨 PRIORITY (Critical = Red Banner, Normal = Standard Card)
    priority: {
        type: String,
        default: 'Normal',
        enum: ['Normal', 'Important', 'Critical']
    },

    // 🔗 AUTOMATION LINKS (To auto-delete if the parent event is deleted)
    relatedEventId: { type: String },     // ID of the Calendar Event
    relatedHackathonId: { type: String }, // ID of the Hackathon

    // 👤 ACCOUNTABILITY
    postedBy: { type: String, required: true }, // Faculty Name
    postedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);