const mongoose = require('mongoose');

const HackathonSchema = new mongoose.Schema({
    // Basics
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    location: { type: String, default: "Campus Auditorium" },
    image: { type: String, default: "https://images.unsplash.com/photo-1504384308090-c54be3855833?auto=format&fit=crop&q=80" },

    // ⚔️ CONNECTED TEAMS
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HackathonTeam' }],

    // 🆕 TEAM CONSTRAINTS (New Feature)
    teamSize: {
        min: { type: Number, default: 2 }, // e.g., 1 for Solo allowed
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

    organizer: { type: String, required: true }, // Faculty Name/ID
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hackathon', HackathonSchema);