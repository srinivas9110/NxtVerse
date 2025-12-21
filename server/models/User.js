const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    collegeId: { type: String, required: true, unique: true, uppercase: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    course: { type: String },
    section: { type: String, required: true, uppercase: true },
    role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' },
    lastActive: { type: Date, default: Date.now },

    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    rank: { type: String, default: "E-Rank" },
    shadows: { type: Number, default: 0 }, // Currency for badges
    jobClass: { type: String, default: "None" }, // "None" -> "Necromancer" -> "Shadow Monarch"
    clearedDungeons: { type: [String], default: [] }, // Array of Dungeon IDs

    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    requestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    requestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // --- 🆕 NEW PROFILE FIELDS ---
    bio: { type: String, default: "Computer Science Enthusiast | NxtVerse Member" },

    profilePic: { type: String, default: "" },
    bannerImg: { type: String, default: "" },


    skills: { type: [String], default: [] }, // Array of strings e.g. ["React", "C++"]

    links: {
        github: { type: String, default: "" },
        leetcode: { type: String, default: "" },
        portfolio: { type: String, default: "" }
    },

    projects: [{
        title: String,
        link: String,
        description: String
    }],

    achievements: [{
        title: String,
        date: String,
        type: { type: String, enum: ['Hackathon', 'Competition', 'Event'], default: 'Event' }
    }],
    // -----------------------------

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);