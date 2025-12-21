const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fetchUser = require('../middleware/fetchUser');
const User = require('../models/User');

// 1. Configure Cloudinary
// (Best Practice: Use process.env, but you can hardcode for testing)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Storage Engine
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nxtverse_profiles', // Creates this folder in your Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Restrict file types
        transformation: [{ width: 500, height: 500, crop: 'limit' }], // Optional: Resize huge images
    },
});

const upload = multer({ storage: storage });

// --- THE ROUTE: POST /api/users/upload/:type ---
router.post('/upload/:type', fetchUser, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Cloudinary returns the permanent URL in 'path'
        const imageUrl = req.file.path;

        // Update User in DB
        const fieldToUpdate = req.params.type === 'avatar' ? 'profilePic' : 'bannerImg';

        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user[fieldToUpdate] = imageUrl;
        await user.save();

        res.json({
            success: true,
            [fieldToUpdate]: imageUrl,
            message: "Upload successful"
        });

    } catch (error) {
        console.error("Cloudinary Error:", error);
        res.status(500).json({ message: "Server Error during upload" });
    }
});

module.exports = router;