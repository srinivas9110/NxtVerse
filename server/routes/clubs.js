const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const Workshop = require('../models/Workshop');
const Chat = require('../models/Chat');
const ClubPost = require('../models/ClubPost');
const fetchUser = require('../middleware/fetchUser');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User'); // 🟢 Added User Model

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// ==========================================
// 1. NEW GEN WORKSHOP LOGIC
// ==========================================

// ADD WORKSHOP
router.post('/workshop/add', fetchUser, async (req, res) => {
    try {
        const { clubId, title, date, time, venue, description } = req.body;

        const newChat = new Chat({
            chatName: `${title} - Announcements`,
            isGroupChat: true,
            isAnnouncement: true,
            groupAdmins: [req.user.id],
            users: [req.user.id]
        });
        const savedChat = await newChat.save();

        const workshop = new Workshop({
            clubId, title, date, time, venue, description,
            chatGroupId: savedChat._id,
            organizers: [req.user.id]
        });
        
        const savedWorkshop = await workshop.save();
        
        savedChat.relatedWorkshopId = savedWorkshop._id;
        await savedChat.save();

        res.json(savedWorkshop);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// REGISTER
router.post('/workshop/:id/register', fetchUser, async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.id);
        if (!workshop) return res.status(404).json({ error: "Not Found" });

        if (workshop.status !== 'upcoming') {
            return res.status(400).json({ error: "Registration is closed." });
        }

        if (workshop.attendees.some(a => a.user.toString() === req.user.id)) {
            return res.status(400).json({ error: "Already registered" });
        }

        workshop.attendees.push({ user: req.user.id });
        await workshop.save();

        if (workshop.chatGroupId) {
            await Chat.findByIdAndUpdate(workshop.chatGroupId, {
                $addToSet: { users: req.user.id }
            });
        }

        res.json({ message: "Registered!" });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// FEEDBACK
router.post('/workshop/:id/feedback', fetchUser, async (req, res) => {
    try {
        const { pacing, clarity, vibe, overall } = req.body;
        const workshop = await Workshop.findById(req.params.id);

        const attendee = workshop.attendees.find(a => a.user.toString() === req.user.id);
        if (!attendee) return res.status(404).json({ error: "Not registered" });

        attendee.feedback = { pacing, clarity, vibe, overall, submittedAt: new Date() };

        await workshop.save();
        res.json({ message: "Feedback Recorded! Badge Earned 🏆" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// ==========================================
// 2. CLUB MANAGEMENT (Admins/Presidents)
// ==========================================

// Get All Clubs
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        const clubs = await Club.find()
            .populate('president', 'fullName profilePic')
            .populate('leads', 'fullName');
        res.json(clubs);
    } catch (error) { res.status(500).send("Internal Server Error"); }
});

// Create Club
router.post('/create', fetchUser, async (req, res) => {
    try {
        const { name, description, category, logo, videoUrl } = req.body;
        const club = new Club({
            name, description, category, logo, videoUrl,
            admin: req.user.id, president: req.user.id, members: [req.user.id]
        });
        const savedClub = await club.save();
        res.json(savedClub);
    } catch (error) { res.status(500).send("Server Error"); }
});

// Update Club
router.put('/update/:id', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");
        const { videoUrl, description } = req.body;
        const newDetails = {};
        if (videoUrl !== undefined) newDetails.videoUrl = videoUrl;
        if (description) newDetails.description = description;

        let club = await Club.findByIdAndUpdate(req.params.id, { $set: newDetails }, { new: true });
        res.json(club);
    } catch (err) { res.status(500).send("Update Failed"); }
});

// 🟢 FIX: ASSIGN PRESIDENT (Uses ID now)
router.post('/assign-president', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).json({ message: "Faculty Only" });
        
        // Expecting studentId from frontend search result
        const { clubId, studentId } = req.body; 
        
        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Update Logic
        club.president = student._id;
        await club.save();
        
        res.json({ message: `Assigned ${student.fullName} as President` });
    } catch (err) { 
        console.error("Assign President Error:", err);
        res.status(500).json({ message: "Server Error" }); 
    }
});

// 🟢 FIX: REMOVE PRESIDENT
router.put('/remove-president', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Faculty Only");
        
        const club = await Club.findById(req.body.clubId);
        if (!club) return res.status(404).send("Club not found");

        club.president = null; // Explicitly set null
        await club.save();
        
        res.json({ message: "President removed" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// Get Single Club
router.get('/:id', fetchUser, async (req, res) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate('admin', 'fullName')
            .populate('president', 'fullName profilePic');

        const workshops = await Workshop.find({ clubId: req.params.id })
            .populate({ path: 'attendees.user', select: 'fullName collegeId section role profilePic' })
            .populate('organizers', 'fullName');

        res.json({ club, workshops });
    } catch (err) { res.status(500).send("Server Error"); }
});

// Workshop Organizer Toggle
router.put('/workshop/:id/organizer', fetchUser, async (req, res) => {
    try {
        const { studentId } = req.body;
        if (studentId === req.user.id) return res.status(400).json({ error: "Cannot assign yourself" });

        const workshop = await Workshop.findById(req.params.id);
        if (!workshop) return res.status(404).send("Workshop not found");

        let action = '';
        if (workshop.organizers.includes(studentId)) {
            workshop.organizers = workshop.organizers.filter(id => id.toString() !== studentId);
            action = 'removed';
        } else {
            workshop.organizers.push(studentId);
            action = 'added';
        }
        await workshop.save();

        if (workshop.chatGroupId) {
            if (action === 'added') {
                await Chat.findByIdAndUpdate(workshop.chatGroupId, {
                    $addToSet: { groupAdmins: studentId, users: studentId }
                });
            } else {
                await Chat.findByIdAndUpdate(workshop.chatGroupId, {
                    $pull: { groupAdmins: studentId }
                });
            }
        }

        const updated = await Workshop.findById(req.params.id)
            .populate({ path: 'attendees.user', select: 'fullName collegeId section role' })
            .populate('organizers', 'fullName');
            
        res.json(updated);

    } catch (err) { 
        console.error(err);
        res.status(500).send("Error syncing organizers"); 
    }
});

// Mark Attendance
router.put('/workshop/:id/attendance', fetchUser, async (req, res) => {
    try {
        const { studentId } = req.body;
        const workshop = await Workshop.findById(req.params.id);
        const attendee = workshop.attendees.find(a => a.user.toString() === studentId);
        if (attendee) {
            attendee.present = !attendee.present;
            await workshop.save();
            const updated = await Workshop.findById(req.params.id)
                .populate({ path: 'attendees.user', select: 'fullName collegeId section role' })
                .populate('organizers', 'fullName');
            res.json(updated);
        } else { res.status(404).send("Student not registered"); }
    } catch (err) { res.status(500).send("Error"); }
});

// Delete Workshop
router.delete('/workshop/:id', fetchUser, async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.id);
        if (!workshop) return res.status(404).send("Not Found");

        if (workshop.chatGroupId) {
            const Message = require('../models/Message');
            await Message.deleteMany({ chat: workshop.chatGroupId });
            await Chat.findByIdAndDelete(workshop.chatGroupId);
        }

        await Workshop.findByIdAndDelete(req.params.id);
        res.json({ success: "Workshop and associated Chat deleted" });
    } catch (err) { 
        console.error(err);
        res.status(500).send("Error deleting workshop"); 
    }
});

// Posts
router.get('/:id/posts', fetchUser, async (req, res) => {
    try {
        const posts = await ClubPost.find({ club: req.params.id }).populate('postedBy', 'fullName').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) { res.status(500).send("Error"); }
});

router.post('/:id/post', fetchUser, async (req, res) => {
    try {
        const { caption, link } = req.body;
        const getMediaType = (url) => (url.match(/\.(jpeg|jpg|gif|png)$/) != null || url.includes('cloudinary')) ? 'image' : 'video';
        
        const post = new ClubPost({
            club: req.params.id, postedBy: req.user.id, caption, link, mediaType: getMediaType(link)
        });
        const savedPost = await post.save();
        const populatedPost = await savedPost.populate('postedBy', 'fullName');
        res.json(populatedPost);
    } catch (err) { res.status(500).send("Error"); }
});

router.delete('/post/:id', fetchUser, async (req, res) => {
    try {
        const post = await ClubPost.findById(req.params.id);
        if (!post) return res.status(404).send("Post not found");
        if (post.link && post.mediaType === 'image' && post.link.includes('cloudinary')) {
            const publicId = post.link.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }
        await ClubPost.findByIdAndDelete(req.params.id);
        res.json({ success: "Post deleted" });
    } catch (err) { res.status(500).send("Server Error"); }
});

router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");
        await Club.findByIdAndDelete(req.params.id);
        res.json({ success: "Club deleted" });
    } catch (error) { res.status(500).send("Server Error"); }
});

router.put('/workshop/:id/status', fetchUser, async (req, res) => {
    try {
        const { status } = req.body;
        const workshop = await Workshop.findById(req.params.id);
        workshop.status = status;
        await workshop.save();
        res.json(workshop);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;