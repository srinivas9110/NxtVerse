const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User'); // Import the Blueprint
const fetchUser = require('../middleware/fetchUser'); // Import the Guard

// @route   GET /api/users/fetchall
// @desc    Get all students (except the one logged in)
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        // 1. Find all users where ID is NOT equal ($ne) to my ID
        // 2. .select("-password") -> Don't send their passwords to the frontend!
        // 3. .sort({ createdAt: -1 }) -> Show newest students first
        const users = await User.find({ _id: { $ne: req.user.id } })
            .select("-password")
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save to 'uploads' folder
    },
    filename: function (req, file, cb) {
        // Rename file to prevent duplicates (e.g., user-123-timestamp.jpg)
        cb(null, 'user-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// @route   POST /api/users/upload/:type
// @desc    Upload Profile Pic or Banner
router.post('/upload/:type', fetchUser, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("No file uploaded");

        const userId = req.user.id;
        const type = req.params.type; // 'avatar' or 'banner'

        // Construct URL (e.g., /uploads/user-123.jpg)
        const imageUrl = `/uploads/${req.file.filename}`;

        const updateField = type === 'avatar' ? { profilePic: imageUrl } : { bannerImg: imageUrl };

        // Update User in DB
        const user = await User.findByIdAndUpdate(userId, { $set: updateField }, { new: true }).select("-password");

        res.json(user);

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/users/connect/:id
// @desc    Send a connection request
router.post('/connect/:id', fetchUser, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!targetUser) return res.status(404).send("User not found");
        if (currentUser.connections.includes(req.params.id)) return res.status(400).send("Already connected");
        if (currentUser.requestsSent.includes(req.params.id)) return res.status(400).send("Request already sent");

        // Add to arrays
        currentUser.requestsSent.push(req.params.id);
        targetUser.requestsReceived.push(req.user.id);

        await currentUser.save();
        await targetUser.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/users/accept/:id
// @desc    Accept a request
router.post('/accept/:id', fetchUser, async (req, res) => {
    try {
        const senderId = req.params.id;
        const myId = req.user.id;

        const me = await User.findById(myId);
        const sender = await User.findById(senderId);

        // Add to connections
        me.connections.push(senderId);
        sender.connections.push(myId);

        // Remove from requests
        me.requestsReceived = me.requestsReceived.filter(id => id.toString() !== senderId);
        sender.requestsSent = sender.requestsSent.filter(id => id.toString() !== myId);

        await me.save();
        await sender.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/users/reject/:id
// @desc    Reject a request
router.post('/reject/:id', fetchUser, async (req, res) => {
    try {
        const senderId = req.params.id;
        const me = await User.findById(req.user.id);
        const sender = await User.findById(senderId);

        // Remove from requests only
        me.requestsReceived = me.requestsReceived.filter(id => id.toString() !== senderId);
        sender.requestsSent = sender.requestsSent.filter(id => id.toString() !== req.user.id);

        await me.save();
        await sender.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/users/requests
// @desc    Get my pending requests (for Notifications)
router.get('/requests/pending', fetchUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('requestsReceived', 'fullName profilePic role collegeId');
        res.json(user.requestsReceived);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   DELETE /api/auth/notifications/:id
// @desc    Remove a specific notification
router.delete('/notifications/:id', fetchUser, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { notifications: { _id: req.params.id } }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;