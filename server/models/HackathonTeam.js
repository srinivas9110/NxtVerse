const mongoose = require('mongoose');

const HackathonTeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },

    // Leader Link
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 👥 MEMBERS
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, default: 'Member' }
    }],

    // 📩 REQUESTS (Waitlist)
    requests: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, required: true },
        message: { type: String }
    }],

    // 🔍 OPEN ROLES (Strategy)
    lookingFor: [{ type: String }],

    // 🚀 PROJECT SUBMISSION
    project: {
        title: { type: String, default: "" },
        repoLink: { type: String, default: "" },
        liveLink: { type: String, default: "" },
        description: { type: String, default: "" }
    },

    // 📊 SCORING (Faculty Only)
    scores: {
        innovation: { type: Number, default: 0 },
        codeQuality: { type: Number, default: 0 },
        presentation: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 }
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HackathonTeam', HackathonTeamSchema);