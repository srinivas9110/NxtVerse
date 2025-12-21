const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['file', 'folder'] // 🔒 Strict check
    },
    url: { type: String }, // Cloudinary Link
    parentId: { type: String, default: null }, // Kept as String to match your DB
    restrictedTo: {
        type: String,
        default: 'ALL',
        enum: ['ALL', 'BTECH', 'BSC'] // 🔒 Strict check
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, // Matches your 'user' model
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('resource', ResourceSchema);