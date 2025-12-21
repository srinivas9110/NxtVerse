const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const fetchUser = require('../middleware/fetchUser');

// @route   GET /api/messages/conversations
// @desc    Get users I have chatted with
router.get('/conversations', fetchUser, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 1. Find all messages involving me
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }]
        }).sort({ timestamp: -1 });

        const talkedUserIds = new Set();

        messages.forEach(msg => {
            const senderId = msg.sender.toString();
            const receiverId = msg.receiver.toString();

            // Logic: If I am the sender, the other is receiver. If I am receiver, other is sender.
            const otherId = (senderId === currentUserId) ? receiverId : senderId;

            talkedUserIds.add(otherId);
        });

        // 🛡️ SAFETY LOCK: Remove my own ID from the set (Just in case of self-messages)
        talkedUserIds.delete(currentUserId);

        // 2. Fetch details of these users
        const conversations = await User.find({
            _id: { $in: Array.from(talkedUserIds) }
        }).select('fullName email role profilePic');

        res.json(conversations);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/messages/:userId
// @desc    Get chat history with a specific person
router.get('/:userId', fetchUser, async (req, res) => {
    try {
        const myId = req.user.id;
        const otherId = req.params.userId;

        // Find messages where (Sender is ME and Receiver is THEM) OR (Sender is THEM and Receiver is ME)
        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: otherId },
                { sender: otherId, receiver: myId }
            ]
        }).sort({ timestamp: 1 }); // Oldest first

        res.json(messages);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/messages/send/:userId
// @desc    Send a message
router.post('/send/:userId', fetchUser, async (req, res) => {
    try {
        const { text } = req.body;
        const newMessage = new Message({
            sender: req.user.id,
            receiver: req.params.userId,
            text
        });

        const savedMessage = await newMessage.save();
        res.json(savedMessage);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;