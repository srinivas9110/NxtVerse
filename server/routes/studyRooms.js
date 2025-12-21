const express = require('express');
const router = express.Router();
const StudyRoom = require('../models/StudyRoom');
const User = require('../models/User'); // Need this to get real names
const fetchUser = require('../middleware/fetchUser');

// @route   GET /api/studyrooms/fetchall
// @desc    Get all active rooms + Auto-Cleanup old ones
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        // 🧹 AUTO-CLEANUP: Delete rooms older than 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await StudyRoom.deleteMany({ createdAt: { $lt: twentyFourHoursAgo } });

        const rooms = await StudyRoom.find().sort({ createdAt: -1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/studyrooms/create
// @desc    Create a new pod (Secure Name Fetching)
router.post('/create', fetchUser, async (req, res) => {
    try {
        const { name, subject, maxParticipants, duration, isPrivate, passcode } = req.body;

        // 1. Fetch Real User Name (Security)
        const user = await User.findById(req.user.id);
        const realName = user.fullName;

        // 2. Generate Unique Room ID
        const roomId = "NxtVerse-" + Math.random().toString(36).substring(7);

        const newRoom = new StudyRoom({
            name, subject, roomId, maxParticipants, duration,
            creator: realName,
            creatorId: req.user.id,
            isPrivate: isPrivate || false,
            passcode: isPrivate ? passcode : null
        });

        const savedRoom = await newRoom.save();
        res.json(savedRoom);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   PUT /api/studyrooms/join/:id
// @desc    Add user to active list
router.put('/join/:id', fetchUser, async (req, res) => {
    try {
        const room = await StudyRoom.findById(req.params.id);
        if (!room) return res.status(404).send("Room not found");

        // Add user if not already present
        if (!room.activeUsers.includes(req.user.id)) {
            room.activeUsers.push(req.user.id);
            await room.save();
        }
        res.json(room);
    } catch (error) { res.status(500).send("Error"); }
});

// @route   PUT /api/studyrooms/leave/:id
// @desc    Remove user from active list
router.put('/leave/:id', fetchUser, async (req, res) => {
    try {
        const room = await StudyRoom.findById(req.params.id);
        if (!room) return res.status(404).send("Room not found");

        // Remove user
        room.activeUsers = room.activeUsers.filter(id => id.toString() !== req.user.id);
        await room.save();
        res.json(room);
    } catch (error) { res.status(500).send("Error"); }
});

// @route   DELETE /api/studyrooms/delete/:id
// @desc    End Pod (Host Only)
router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        const room = await StudyRoom.findById(req.params.id);
        if (!room) return res.status(404).send("Not Found");

        // Strict Check: Only Creator can delete
        if (room.creatorId.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        await StudyRoom.findByIdAndDelete(req.params.id);
        res.json({ success: "Pod Ended" });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;