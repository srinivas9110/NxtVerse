const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat'); // Import the new model
const fetchUser = require('../middleware/fetchUser');

// @route   GET /api/messages/conversations
// @desc    Get Sidebar List (Both Groups & DMs)
router.get('/conversations', fetchUser, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 1. FETCH GROUPS (The new feature)
        // Find any chat where I am a member
        const groupChats = await Chat.find({ users: currentUserId })
            .populate('latestMessage')
            .sort({ updatedAt: -1 });

        // 2. FETCH LEGACY DMs (Your existing logic)
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }],
            chat: { $exists: false } // Only find messages NOT in a group
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
        // We format groups to look similar to users so the Frontend UI doesn't break
        const formattedGroups = groupChats.map(chat => ({
            _id: chat._id,
            fullName: chat.chatName, // Map chatName to fullName for UI compatibility
            isGroup: true,
            isAnnouncement: chat.isAnnouncement,
            groupAdmins: chat.groupAdmins,
            // Use a default group avatar or the latest message logic
            profilePic: null 
        }));

        // Combine and send
        res.json([...formattedGroups, ...dmUsers]);

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/messages/:id
// @desc    Get history (Works for UserID OR GroupID)
router.get('/:id', fetchUser, async (req, res) => {
    try {
        const myId = req.user.id;
        const targetId = req.params.id;

        // Check if this ID belongs to a Group (Chat)
        const isGroup = await Chat.findById(targetId);

        let messages;

        if (isGroup) {
            // A. It's a Group: Fetch by Chat ID
            // This ensures late joiners see ALL history
            messages = await Message.find({ chat: targetId })
                .populate('sender', 'fullName profilePic') // We need sender info for groups
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

        const isGroup = await Chat.findById(targetId);

        let newMessage;

        if (isGroup) {
            // 🔒 SECURITY: Check if it's an announcement channel
            if (isGroup.isAnnouncement) {
                // Check if sender is an admin
                if (!isGroup.groupAdmins.includes(senderId)) {
                    return res.status(403).json({ error: "Only admins can send messages here." });
                }
            }

            newMessage = new Message({
                sender: senderId,
                chat: targetId, // Link to Group
                text
            });

            // Update latest message for sidebar sorting
            await Chat.findByIdAndUpdate(targetId, { latestMessage: newMessage._id });

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
        console.error(error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;