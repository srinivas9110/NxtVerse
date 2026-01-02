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



    // Leadership Flag

    isPresident: { type: Boolean, default: false },



    // Gamification

    xp: { type: Number, default: 0 },

    level: { type: Number, default: 1 },

    rank: { type: String, default: "E-Rank" },

    shadows: { type: Number, default: 0 }, 

    jobClass: { type: String, default: "None" },

    clearedDungeons: { type: [String], default: [] },



    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    requestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    requestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],



    // 🟢 NEW: Notifications System (Fixes the Invite Error)

    notifications: [{

        type: { type: String }, // 'pod_invite', 'system', etc.

        senderName: String,

        senderId: mongoose.Schema.Types.ObjectId,

        message: String,

        data: Object, // Stores podId, roomId, passcode

        timestamp: { type: Date, default: Date.now },

        read: { type: Boolean, default: false }

    }],



    // Profile

    bio: { type: String, default: "Computer Science Enthusiast | NxtVerse Member" },

    profilePic: { type: String, default: "" },

    bannerImg: { type: String, default: "" },

    skills: { type: [String], default: [] },



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



    createdAt: { type: Date, default: Date.now }

});



// VIRTUAL: Calculate Unlocked Badges

UserSchema.virtual('unlockedBadges').get(function() {

    const unlocked = [];

    if (this.level >= 5) unlocked.push('architect');

    if (this.xp > 1000) unlocked.push('high-scholar');

    if (this.role === 'faculty' || this.isPresident) unlocked.push('apex-leader');

    if (this.links && this.links.github) unlocked.push('open-source');

    if (this.links && this.links.portfolio) unlocked.push('node-linker');

    return unlocked;

});



UserSchema.set('toJSON', { virtuals: true });

UserSchema.set('toObject', { virtuals: true });



module.exports = mongoose.model('User', UserSchema);