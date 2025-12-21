const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true }, // Keeping string for simplicity (e.g. "2025-10-15")
    type: { type: String, default: 'academic' }, // 'academic' or 'non-academic'
    postedBy: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);