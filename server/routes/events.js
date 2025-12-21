const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const fetchUser = require('../middleware/fetchUser');
const User = require('../models/User');

// @route   GET /api/events/fetchall
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (error) { res.status(500).send("Server Error"); }
});

// @route   POST /api/events/add
// @desc    Transmit a new Signal (Faculty Only)
router.post('/add', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");

        const { title, description, date, location, category, videoUrl } = req.body;

        const newEvent = new Event({
            title, description, date, location, category, videoUrl,
            organizer: req.user.id
        });

        const savedEvent = await newEvent.save();
        res.json(savedEvent);
    } catch (error) { res.status(500).send("Server Error"); }
});

// @route   PUT /api/events/rsvp/:id
// @desc    Lock/Unlock Signal (RSVP)
router.put('/rsvp/:id', fetchUser, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).send("Event not found");

        const index = event.attendees.indexOf(req.user.id);

        if (index === -1) {
            event.attendees.push(req.user.id); // Join
        } else {
            event.attendees.splice(index, 1); // Leave
        }

        await event.save();
        res.json(event);
    } catch (error) { res.status(500).send("Server Error"); }
});

// @route   DELETE /api/events/delete/:id
// @desc    Delete an event (Faculty Only)
router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");

        await Event.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Event deleted" });
    } catch (error) { res.status(500).send("Server Error"); }
});

// ... existing imports ...

// --- 🆕 2. GET DASHBOARD DATA (For Modal) ---
router.get('/:id/participants', fetchUser, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('attendees', 'fullName collegeId section')
            .populate('organizers', 'fullName')
            .populate('present', '_id');

        // 🛡️ SAFETY CHECK 1: Did we find the event?
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // 🛡️ SAFETY CHECK 2: Get user role safely
        // (We fetch the user from DB to be 100% sure of their role)
        const user = await User.findById(req.user.id);
        const isFaculty = user.role === 'faculty';

        // Check if current user is in the organizers list
        // We use optional chaining (?.) just in case the list is empty/undefined
        const isOrganizer = event.organizers?.some(org => org._id.toString() === req.user.id);

        if (!isFaculty && !isOrganizer) {
            return res.status(403).json({ error: "Access Denied: You are not an organizer." });
        }

        res.json(event);
    } catch (error) {
        console.error("Dashboard Error:", error); // This will print the real reason in your terminal
        res.status(500).send("Server Error");
    }
});

// 2. PROMOTE STUDENT TO ORGANIZER (Faculty Only)
router.put('/promote/:id', fetchUser, async (req, res) => {
    try {
        const { studentId } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event.organizers.includes(studentId)) {
            event.organizers.push(studentId);
            await event.save();
        }
        res.json(event);
    } catch (error) {
        res.status(500).send("Error promoting student");
    }
});

// 3. MARK ATTENDANCE (Organizers & Faculty)
router.put('/checkin/:id', fetchUser, async (req, res) => {
    try {
        const { studentId } = req.body;
        const event = await Event.findById(req.params.id);

        // Toggle Presence
        if (event.present.includes(studentId)) {
            event.present = event.present.filter(id => id.toString() !== studentId);
        } else {
            event.present.push(studentId);
        }
        await event.save();
        res.json(event.present);
    } catch (error) {
        res.status(500).send("Error marking attendance");
    }
});

module.exports = router;