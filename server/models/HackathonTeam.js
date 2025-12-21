const mongoose = require('mongoose');

const HackathonTeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },

    // 🟢 FIX: Changed 'user' to 'User'
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 👥 MEMBERS
    members: [{
        // 🟢 FIX: Changed 'user' to 'User'
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, default: 'Member' }
    }],

    // 📩 REQUESTS
    requests: [{
        // 🟢 FIX: Changed 'user' to 'User'
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, required: true },
        message: { type: String }
    }],

    // 🔍 OPEN ROLES
    lookingFor: [{ type: String }],

    // 🚀 PROJECT
    project: {
        title: { type: String, default: "" },
        repoLink: { type: String, default: "" },
        liveLink: { type: String, default: "" },
        description: { type: String, default: "" }
    },

    // 📊 SCORING
    scores: {
        innovation: { type: Number, default: 0 },
        codeQuality: { type: Number, default: 0 },
        presentation: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 }
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HackathonTeam', HackathonTeamSchema);