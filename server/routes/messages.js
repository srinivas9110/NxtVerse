const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // ✅ Added for validation
const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');
const fetchUser = require('../middleware/fetchUser');

// Helper to check IDs safely
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @route   GET /api/messages/conversations
// @desc    Get Sidebar List
router.get('/conversations', fetchUser, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 🛡️ SAFETY: If User ID is somehow invalid, stop.
        if (!isValidId(currentUserId)) return res.status(400).json({ error: "Invalid User ID" });

        // 1. FETCH GROUPS
        const groupChats = await Chat.find({ 
            users: { $in: [currentUserId] } 
        })
        .populate('latestMessage')
        .sort({ updatedAt: -1 });

        // 2. FETCH LEGACY DMs
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }],
            chat: { $exists: false }
        }).sort({ timestamp: -1 });

        const talkedUserIds = new Set();
        messages.forEach(msg => {
            const otherId = (msg.sender.toString() === currentUserId) 
                ? msg.receiver.toString() 
                : msg.sender.toString();
            if (isValidId(otherId)) talkedUserIds.add(otherId); // 🛡️ Check validity
        });
        talkedUserIds.delete(currentUserId);

        const dmUsers = await User.find({ _id: { $in: Array.from(talkedUserIds) } })
            .select('fullName email role profilePic');

        // 3. MERGE
        const formattedGroups = groupChats.map(chat => ({
            _id: chat._id,
            fullName: chat.chatName, 
            isGroup: true,
            isAnnouncement: chat.isAnnouncement,
            groupAdmins: chat.groupAdmins,
            profilePic: null 
        }));

        res.json([...formattedGroups, ...dmUsers]);

    } catch (error) {
        console.error("Sidebar Error:", error);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/messages/:id
// @desc    Get history
router.get('/:id', fetchUser, async (req, res) => {
    try {
        const myId = req.user.id;
        const targetId = req.params.id;

        // 🛡️ SAFETY: Prevent "undefined" crash
        if (!isValidId(targetId)) {
            return res.status(400).json({ error: "Invalid Chat ID" });
        }

        // Check if Group
        const isGroup = await Chat.findById(targetId);

        let messages;

        if (isGroup) {
            messages = await Message.find({ chat: targetId })
                .populate('sender', 'fullName profilePic')
                .sort({ timestamp: 1 });
        } else {
            messages = await Message.find({
                $or: [
                    { sender: myId, receiver: targetId },
                    { sender: targetId, receiver: myId }
                ]
            }).sort({ timestamp: 1 });
        }

        res.json(messages);
    } catch (error) {
        console.error("Fetch Messages Error:", error);
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/messages/send/:id
// @desc    Send Message
router.post('/send/:id', fetchUser, async (req, res) => {
    try {
        const { text } = req.body;
        const targetId = req.params.id;
        const senderId = req.user.id;

        // 🛡️ SAFETY: Prevent "undefined" crash
        if (!isValidId(targetId)) return res.status(400).json({ error: "Invalid Target ID" });

        const isGroup = await Chat.findById(targetId);
        let newMessage;

        if (isGroup) {
            // ADMIN CHECK
            if (isGroup.isAnnouncement) {
                const isAdmin = isGroup.groupAdmins.some(adminId => adminId.toString() === senderId);
                if (!isAdmin) return res.status(403).json({ error: "Only admins can send messages here." });
            }

            newMessage = new Message({
                sender: senderId,
                chat: targetId,
                text
            });

            await Chat.findByIdAndUpdate(targetId, { 
                latestMessage: newMessage._id,
                updatedAt: new Date() 
            });

        } else {
            newMessage = new Message({
                sender: senderId,
                receiver: targetId,
                text
            });
        }

        const savedMessage = await newMessage.save();
        res.json(savedMessage);

    } catch (error) {
        console.error("Send Error:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;