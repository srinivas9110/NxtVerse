const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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

        const groupChats = await Chat.find({ users: currentUserId })
            .populate('latestMessage')
            .sort({ updatedAt: -1 });

        // 🟢 FIX: Only fetch messages NOT hidden for me
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }],
            chat: { $exists: false },
            hiddenFor: { $ne: currentUserId } // 👈 Exclude if hidden
        }).sort({ timestamp: -1 });

        const talkedUserIds = new Set();
        messages.forEach(msg => {
            const otherId = (msg.sender.toString() === currentUserId) 
                ? msg.receiver.toString() 
                : msg.sender.toString();
            if (isValidId(otherId)) talkedUserIds.add(otherId);
        });
        talkedUserIds.delete(currentUserId);

        const dmUsers = await User.find({ _id: { $in: Array.from(talkedUserIds) } })
            .select('fullName email role profilePic');

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

        if (!isValidId(targetId)) return res.status(400).json({ error: "Invalid Chat ID" });

        const isGroup = await Chat.findById(targetId);
        let query = {};

        if (isGroup) {
            query = { chat: targetId };
        } else {
            query = {
                $or: [
                    { sender: myId, receiver: targetId },
                    { sender: targetId, receiver: myId }
                ]
            };
        }

        // 🟢 FIX: Exclude hidden messages
        query.hiddenFor = { $ne: myId };

        const messages = await Message.find(query)
            .populate('sender', 'fullName profilePic')
            .sort({ timestamp: 1 });

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

        if (!isValidId(targetId)) return res.status(400).json({ error: "Invalid Target ID" });

        // If DM, we must "unhide" previous messages for the receiver 
        // so the chat reappears in their sidebar if they deleted it.
        if (!await Chat.exists({ _id: targetId })) {
             await Message.updateMany(
                { 
                    $or: [
                        { sender: senderId, receiver: targetId },
                        { sender: targetId, receiver: senderId }
                    ]
                },
                { $pull: { hiddenFor: targetId } } // Remove receiver from hidden array
            );
        }

        const isGroup = await Chat.findById(targetId);
        let newMessage;

        if (isGroup) {
            if (isGroup.isAnnouncement) {
                const isAdmin = isGroup.groupAdmins.some(adminId => adminId.toString() === senderId);
                if (!isAdmin) return res.status(403).json({ error: "Only admins can send messages here." });
            }
            newMessage = new Message({ sender: senderId, chat: targetId, text });
            await Chat.findByIdAndUpdate(targetId, { latestMessage: newMessage._id, updatedAt: new Date() });
        } else {
            newMessage = new Message({ sender: senderId, receiver: targetId, text });
        }

        const savedMessage = await newMessage.save();
        res.json(savedMessage);

    } catch (error) {
        console.error("Send Error:", error);
        res.status(500).send("Server Error");
    }
});

// @route   PUT /api/messages/react/:id
// @desc    Toggle Reaction
router.put('/react/:id', fetchUser, async (req, res) => {
    try {
        const { emoji } = req.body;
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).send("Message not found");

        const existingIndex = message.reactions.findIndex(
            r => r.user.toString() === req.user.id && r.emoji === emoji
        );

        if (existingIndex > -1) {
            message.reactions.splice(existingIndex, 1);
        } else {
            message.reactions.push({ user: req.user.id, emoji });
        }

        await message.save();
        res.json(message.reactions);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   DELETE /api/messages/delete/:id
// @desc    Soft Delete Conversation
router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        const targetId = req.params.id; 
        const myId = req.user.id;

        const isGroup = await Chat.findById(targetId);

        if (isGroup) {
            // Group: Only admin can fully delete. 
            // Regular user leaving/clearing chat is complex, for now assume Admin Nuke.
            if (isGroup.groupAdmins.includes(myId)) {
                await Message.deleteMany({ chat: targetId });
                await Chat.findByIdAndDelete(targetId);
                return res.json({ success: "Group deleted" });
            } else {
                return res.status(403).json({ error: "Only admins can delete the group" });
            }
        } else {
            // 🟢 DM: Soft Delete (Hide messages for ME only)
            await Message.updateMany(
                {
                    $or: [
                        { sender: myId, receiver: targetId },
                        { sender: targetId, receiver: myId }
                    ]
                },
                { $addToSet: { hiddenFor: myId } } // Add my ID to hidden list
            );
            return res.json({ success: "Chat history cleared" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;