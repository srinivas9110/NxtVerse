const mongoose = require('mongoose');

const WorkshopSchema = new mongoose.Schema({
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    title: String,
    date: Date,
    time: String,
    venue: String,
    description: String,
    organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    chatGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },

    // 🟢 NEW: Manual Lifecycle Status
    status: { 
        type: String, 
        enum: ['upcoming', 'live', 'completed'], 
        default: 'upcoming' 
    },

    attendees: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        present: { type: Boolean, default: false },
        feedback: {
            pacing: { type: String, enum: ['Too Slow', 'Perfect', 'Too Fast'] },
            clarity: { type: String, enum: ['Confusing', 'Clear', 'Mind-blowing'] },
            vibe: { type: String, enum: ['Sleepy', 'Okay', 'Hype'] },
            overall: { type: String, enum: ['👍', '👎'] },
            submittedAt: { type: Date }
        }
    }]
});

module.exports = mongoose.model('Workshop', WorkshopSchema);