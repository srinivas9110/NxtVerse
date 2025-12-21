const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Resource = require('../models/Resource');
const fetchUser = require('../middleware/fetchUser');
const Announcement = require('../models/Announcement');

// @route   GET /api/groups/fetchall
// @desc    Get groups relevant to the user
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        // Logic: Show 'Common' groups + groups matching the user's course
        // For MVP, we just return all, but you can filter by req.user.course
        const groups = await Group.find();
        res.json(groups);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/groups/create
// @desc    Create a new Group (Admin/Faculty only)
router.post('/create', fetchUser, async (req, res) => {
    try {
        if (req.user.role === 'student') return res.status(403).send("Access Denied");

        const { name, description, category } = req.body;
        const newGroup = new Group({ name, description, category });
        const savedGroup = await newGroup.save();
        res.json(savedGroup);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/groups/:id/resources
// @desc    Get files for a specific group
router.get('/:id/resources', fetchUser, async (req, res) => {
    try {
        const resources = await Resource.find({ groupId: req.params.id }).sort({ date: -1 });
        res.json(resources);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/groups/:id/upload
// @desc    Upload a resource link (Faculty Only)
router.post('/:id/upload', fetchUser, async (req, res) => {
    try {
        // 1. Check Permissions
        if (req.user.role !== 'faculty') {
            return res.status(403).send("Only Faculty can upload resources");
        }

        const { title, link, type } = req.body;

        // 2. Create the Resource
        const newResource = new Resource({
            title,
            link,
            type,
            groupId: req.params.id,
            uploadedBy: req.user.role === 'faculty' ? 'Faculty' : req.user.name
        });

        const savedResource = await newResource.save();

        // --- 3. AUTO-ANNOUNCEMENT TRIGGER (Added this for you) ---
        // This makes it show up on the Dashboard automatically!
        const groupName = "the Group"; // You can fetch the group name if you want to be specific
        await new Announcement({
            message: `New Resource uploaded: "${title}"`,
            type: 'resource',
            relatedId: req.params.id
        }).save();
        // -------------------------------------------------------

        res.json(savedResource);

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;