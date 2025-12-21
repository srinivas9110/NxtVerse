const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const User = require('../models/User'); // To get the poster's real name
const fetchUser = require('../middleware/fetchUser');

// @route   GET /api/announcements/fetchall
// @desc    Get announcements filtered by Course (Smart Matching)
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        let query = {};

        // 1. IF FACULTY: Show Everything
        if (user.role === 'faculty') {
            query = {};
        }
        // 2. IF STUDENT: Smart Filter
        else {
            let userStream = "All";

            // 🧠 SMART MATCHING LOGIC
            // Convert "B.Sc Computer Science" -> "B.Sc"
            if (user.course && user.course.includes("B.Sc")) {
                userStream = "B.Sc";
            } else if (user.course && user.course.includes("B.Tech")) {
                userStream = "B.Tech";
            }

            // Fetch posts for 'All' OR the specific short-code stream
            query = { targetAudience: { $in: ['All', userStream] } };
        }

        const announcements = await Announcement.find(query)
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(announcements);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/announcements/add
// @desc    Faculty Post with Categories & Priority
router.post('/add', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");

        const user = await User.findById(req.user.id);
        const { message, category, targetAudience, priority, relatedEventId } = req.body;

        const announcement = new Announcement({
            message,
            category: category || 'General',
            targetAudience: targetAudience || ['All'],
            priority: priority || 'Normal',
            relatedEventId,
            postedBy: user.fullName, // ✅ Accountability
            postedById: req.user.id
        });

        await announcement.save();
        res.json(announcement);
    } catch (error) { res.status(500).send("Server Error"); }
});

// @route   DELETE /api/announcements/delete/:id
router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ success: "Deleted" });
    } catch (error) { res.status(500).send("Server Error"); }
});

module.exports = router;