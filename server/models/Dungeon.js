const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    id: { type: Number },
    q: { type: String, required: true },
    options: [{ type: String, required: true }],
    correct: { type: Number, required: true }
});

const DungeonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    rank: { type: String, default: 'E-Rank', enum: ['E-Rank', 'D-Rank', 'C-Rank', 'B-Rank', 'A-Rank', 'S-Rank'] },
    xpReward: { type: Number, required: true },
    questions: [QuestionSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dungeon', DungeonSchema);