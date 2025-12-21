const mongoose = require('mongoose');

const ClubSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    videoUrl: { type: String }, // Banner Video

    // 👑 HIERARCHY
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Faculty
    president: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Student President
    leads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Club Core Team

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Club', ClubSchema);