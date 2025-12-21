const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },

    // 🎥 Streaming Link
    videoUrl: { type: String },

    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],


    organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    present: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    organizer: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('event', EventSchema);