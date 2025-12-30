const mongoose = require('mongoose');

const HackathonSchema = new mongoose.Schema({
    // Basics
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    location: { type: String, default: "Campus Auditorium" },
    image: { type: String, default: "https://images.unsplash.com/photo-1504384308090-c54be3855833?auto=format&fit=crop&q=80" },

    // 🟢 NEW: Guidelines Link (For the Rulebook feature)
    guidelinesLink: { type: String, default: "" },

    // ⚔️ CONNECTED TEAMS
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HackathonTeam' }],

    // 🆕 TEAM CONSTRAINTS
    teamSize: {
        min: { type: Number, default: 2 },
        max: { type: Number, default: 5 }
    },

    // 🏆 WINNERS
    winners: {
        first: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonTeam' },
        second: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonTeam' },
        third: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonTeam' }
    },

    // Status
    status: { type: String, enum: ['upcoming', 'live', 'judging', 'completed'], default: 'upcoming' },

    // 🟢 FIX: Changed to ObjectId for secure permission checks
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hackathon', HackathonSchema);