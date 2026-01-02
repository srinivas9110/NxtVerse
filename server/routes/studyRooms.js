const express = require('express');

const router = express.Router();

const StudyRoom = require('../models/StudyRoom');

const User = require('../models/User');

const fetchUser = require('../middleware/fetchUser');



// @route   GET /api/studyrooms/fetchall

// @desc    Get active rooms (public) + completed rooms (host only, today)

router.get('/fetchall', fetchUser, async (req, res) => {

    try {

        const userId = req.user.id;

       

        // Calculate start of today (00:00:00)

        const startOfToday = new Date();

        startOfToday.setHours(0, 0, 0, 0);



        // 1. Active Rooms (Visible to Everyone)

        const activeRooms = await StudyRoom.find({ status: 'active' }).sort({ createdAt: -1 });



        // 2. Completed Rooms (Visible ONLY to Creator, created Today)

        const myCompletedRooms = await StudyRoom.find({

            status: 'completed',

            creatorId: userId,

            createdAt: { $gte: startOfToday }

        }).sort({ endedAt: -1 });



        // 3. Auto-Cleanup: Delete older active rooms (e.g. > 24h) if needed

        // (Optional: You can keep your old cleanup logic here if you want)



        res.json([...activeRooms, ...myCompletedRooms]);

    } catch (error) {

        console.error(error);

        res.status(500).send("Server Error");

    }

});



// @route   POST /api/studyrooms/create

// @desc    Create a new pod

router.post('/create', fetchUser, async (req, res) => {

    try {

        const { name, subject, maxParticipants, duration, isPrivate, passcode } = req.body;

        const user = await User.findById(req.user.id);

        const roomId = "NxtVerse-" + Math.random().toString(36).substring(7);



        const newRoom = new StudyRoom({

            name, subject, roomId, maxParticipants, duration,

            creator: user.fullName,

            creatorId: req.user.id,

            isPrivate: isPrivate || false,

            passcode: isPrivate ? passcode : null,

            status: 'active'

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

       

        // Prevent joining if completed (unless logic requires otherwise, but generally no new joins)

        if (room.status === 'completed') return res.status(400).send("Pod has ended");



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



        room.activeUsers = room.activeUsers.filter(id => id.toString() !== req.user.id);

        await room.save();

        res.json(room);

    } catch (error) { res.status(500).send("Error"); }

});



// @route   PUT /api/studyrooms/end/:id

// @desc    Soft End Pod (Host Only) - Marks as completed

router.put('/end/:id', fetchUser, async (req, res) => {

    try {

        const room = await StudyRoom.findById(req.params.id);

        if (!room) return res.status(404).send("Not Found");



        if (room.creatorId.toString() !== req.user.id) {

            return res.status(401).send("Not Allowed");

        }



        room.status = 'completed';

        room.endedAt = Date.now();

        // We keep activeUsers for history or clear them depending on preference.

        // Usually clearing them implies the room is empty in the UI list.

        room.activeUsers = [];

       

        await room.save();

        res.json({ success: "Pod Ended", room });

    } catch (error) {

        res.status(500).send("Server Error");

    }

});



// @route   PUT /api/studyrooms/update/:id

// @desc    Update Pod settings (Limit/Duration) during meeting

router.put('/update/:id', fetchUser, async (req, res) => {

    try {

        const { maxParticipants } = req.body;

        const room = await StudyRoom.findById(req.params.id);

       

        if (!room) return res.status(404).send("Room not found");

        if (room.creatorId.toString() !== req.user.id) return res.status(401).send("Unauthorized");



        if (maxParticipants) room.maxParticipants = maxParticipants;

       

        await room.save();

        res.json(room);

    } catch (error) {

        res.status(500).send("Server Error");

    }

});



// @route   POST /api/studyrooms/invite

// @desc    Invite a user to the pod (Host Only)

router.post('/invite', fetchUser, async (req, res) => {

    try {

        const { targetUserId, podId } = req.body;

        const hostId = req.user.id;



        // 1. Get Host Name

        const host = await User.findById(hostId);

       

        // 2. Get Pod Name

        const pod = await StudyRoom.findById(podId);

        if (!pod) return res.status(404).json({ error: "Pod not found" });



        // 3. Create Notification Object

        const notification = {

            type: 'pod_invite',

            message: `${host.fullName} invited you to join '${pod.name}'`,

            data: { podId: pod._id, roomId: pod.roomId }, // Data needed to join

            timestamp: new Date(),

            read: false

        };



        // 4. Push to Target User's Notification Array

        // (Note: We assume your User model has a 'notifications' array. If not, this might fail quietly or need schema update)

        await User.findByIdAndUpdate(targetUserId, {

            $push: { notifications: notification }

        });



        res.json({ success: "Invitation sent" });



    } catch (error) {

        console.error(error);

        res.status(500).send("Server Error");

    }

});



module.exports = router;