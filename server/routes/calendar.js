const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const fetchUser = require('../middleware/fetchUser');

// Get All Events
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        // Sort by date? Or created? Let's sort by creation for now
        const events = await CalendarEvent.find().sort({ createdAt: -1 });
        res.json(events);
    } catch (error) { res.status(500).send("Server Error"); }
});

// Add Event (Faculty Only)
router.post('/add', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(401).send("Access Denied");

        const { title, date, type } = req.body;
        const event = new CalendarEvent({ title, date, type, postedBy: req.user.id });
        await event.save();
        res.json(event);
    } catch (error) { res.status(500).send("Server Error"); }
});

// Delete Event (Faculty Only)
router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(401).send("Access Denied");
        await CalendarEvent.findByIdAndDelete(req.params.id);
        res.json({ success: "Event Deleted" });
    } catch (error) { res.status(500).send("Server Error"); }
});

module.exports = router;