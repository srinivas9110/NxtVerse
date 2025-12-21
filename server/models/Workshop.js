const mongoose = require('mongoose');
const WorkshopSchema = new mongoose.Schema({
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    title: String,
    date: Date,
    time: String,
    venue: String,
    description: String,
    organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attendees: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        present: { type: Boolean, default: false }
    }]
});
module.exports = mongoose.model('Workshop', WorkshopSchema);