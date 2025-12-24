const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat'); // Ensure this matches your file name exactly
const fetchUser = require('../middleware/fetchUser');

// @route   GET /api/messages/conversations
// @desc    Get Sidebar List (Both Groups & DMs)
router.get('/conversations', fetchUser, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 🟢 FIX 1: Robust Query for Vanishing Groups
        // We use $in to ensure Mongoose handles the String vs ObjectId matching correctly
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
            talkedUserIds.add(otherId);
        });
        talkedUserIds.delete(currentUserId);

        const dmUsers = await User.find({ _id: { $in: Array.from(talkedUserIds) } })
            .select('fullName email role profilePic');

        // 3. MERGE THEM
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
// @desc    Get history (Works for UserID OR GroupID)
router.get('/:id', fetchUser, async (req, res) => {
    try {
        const myId = req.user.id;
        const targetId = req.params.id;

        // Check if this ID belongs to a Group
        // We use try/catch here because if targetId is not a valid ObjectId, it might crash
        let isGroup = null;
        try {
            isGroup = await Chat.findById(targetId);
        } catch (e) {
            isGroup = null; // Not a group ID
        }

        let messages;

        if (isGroup) {
            // A. It's a Group: Fetch by Chat ID
            messages = await Message.find({ chat: targetId })
                .populate('sender', 'fullName profilePic')
                .sort({ timestamp: 1 });
        } else {
            // B. It's a User: Fetch Legacy DM
            messages = await Message.find({
                $or: [
                    { sender: myId, receiver: targetId },
                    { sender: targetId, receiver: myId }
                ]
            }).sort({ timestamp: 1 });
        }

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/messages/send/:id
// @desc    Send (Checks permissions for Groups)
router.post('/send/:id', fetchUser, async (req, res) => {
    try {
        const { text } = req.body;
        const targetId = req.params.id;
        const senderId = req.user.id;

        let isGroup = null;
        try {
            isGroup = await Chat.findById(targetId);
        } catch (e) {
            isGroup = null;
        }

        let newMessage;

        if (isGroup) {
            // 🟢 FIX 2: "Failed to Send" for President
            // Problem: groupAdmins contains ObjectIds, senderId is a String.
            // Solution: Convert IDs to strings before checking.
            if (isGroup.isAnnouncement) {
                const isAdmin = isGroup.groupAdmins.some(adminId => adminId.toString() === senderId);
                
                if (!isAdmin) {
                    return res.status(403).json({ error: "Only admins can send messages here." });
                }
            }

            newMessage = new Message({
                sender: senderId,
                chat: targetId,
                text
            });

            // Update latest message and 'updatedAt' so it jumps to top of sidebar
            await Chat.findByIdAndUpdate(targetId, { 
                latestMessage: newMessage._id,
                updatedAt: new Date() 
            });

        } else {
            // Legacy DM
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