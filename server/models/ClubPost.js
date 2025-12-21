const mongoose = require('mongoose');

const ClubPostSchema = new mongoose.Schema({
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    caption: { type: String },
    link: { type: String }, // URL of image or video

    // 📸 SMART FEED SUPPORT
    mediaType: { type: String, enum: ['video', 'image', 'link'], default: 'link' },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClubPost', ClubPostSchema);