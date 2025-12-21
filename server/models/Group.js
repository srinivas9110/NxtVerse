const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "B.Sc Computer Science"
    description: String,
    category: { type: String, enum: ['B.Sc', 'B.Tech', 'Common'], required: true },
    members: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);