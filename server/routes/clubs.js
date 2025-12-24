const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const Workshop = require('../models/Workshop');
const Chat = require('../models/Chat'); // ✅ New
const ClubPost = require('../models/ClubPost'); // ✅ Added missing model import
const fetchUser = require('../middleware/fetchUser');
const cloudinary = require('cloudinary').v2; // ✅ Added Cloudinary

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// ==========================================
// 1. NEW GEN WORKSHOP LOGIC (Chat & Feedback)
// ==========================================

// ADD WORKSHOP (Creates Broadcast Channel)
router.post('/workshop/add', fetchUser, async (req, res) => {
    try {
        const { clubId, title, date, time, venue, description } = req.body;

        // A. Create the "Ghost" Broadcast Channel
        const newChat = new Chat({
            chatName: `${title} - Announcements`,
            isGroupChat: true,
            isAnnouncement: true, // 🔒 Only Admins can text
            groupAdmins: [req.user.id], // President is Admin
            users: [req.user.id] // President is first member
        });
        const savedChat = await newChat.save();

        // B. Create Workshop linked to that Chat
        const workshop = new Workshop({
            clubId, title, date, time, venue, description,
            chatGroupId: savedChat._id, // 🔗 Link established
            organizers: [req.user.id]
        });
        
        const savedWorkshop = await workshop.save();
        
        // Update chat to link back
        savedChat.relatedWorkshopId = savedWorkshop._id;
        await savedChat.save();

        res.json(savedWorkshop);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// REGISTER (Auto-adds user to Group)
router.post('/workshop/:id/register', fetchUser, async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.id);
        if (!workshop) return res.status(404).json({ error: "Not Found" });

        // Check if already registered
        if (workshop.attendees.some(a => a.user.toString() === req.user.id)) {
            return res.status(400).json({ error: "Already registered" });
        }

        // A. Add to Workshop
        workshop.attendees.push({ user: req.user.id });
        await workshop.save();

        // B. Auto-Join the Chat Group 🚀
        if (workshop.chatGroupId) {
            await Chat.findByIdAndUpdate(workshop.chatGroupId, {
                $addToSet: { users: req.user.id } // Prevent duplicates
            });
        }

        res.json({ message: "Registered & Added to Announcement Channel!" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// FEEDBACK (Cafe Style)
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
// 2. EXISTING CLUB & POST ROUTES
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

// Update Club Details
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

// Assign President
router.post('/assign-president', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Faculty Only");
        const { clubId, studentEmail } = req.body;
        const student = await User.findOne({ email: studentEmail });
        if (!student) return res.status(404).json({ message: "Student email not found" });

        const club = await Club.findById(clubId);
        club.president = student._id;
        await club.save();
        res.json({ message: `Assigned ${student.fullName} as President` });
    } catch (err) { res.status(500).send("Server Error"); }
});

// Remove President
router.put('/remove-president', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Faculty Only");
        const club = await Club.findById(req.body.clubId);
        club.president = undefined;
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

        if (workshop.organizers.includes(studentId)) {
            workshop.organizers = workshop.organizers.filter(id => id.toString() !== studentId);
        } else {
            workshop.organizers.push(studentId);
        }
        await workshop.save();
        const updated = await Workshop.findById(req.params.id)
            .populate({ path: 'attendees.user', select: 'fullName collegeId section role' })
            .populate('organizers', 'fullName');
        res.json(updated);
    } catch (err) { res.status(500).send("Error"); }
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
        await Workshop.findByIdAndDelete(req.params.id);
        res.json({ success: "Deleted" });
    } catch (err) { res.status(500).send("Error"); }
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
        // Simple media type check
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

// Delete Club (Admin)
router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");
        await Club.findByIdAndDelete(req.params.id);
        res.json({ success: "Club deleted" });
    } catch (error) { res.status(500).send("Server Error"); }
});

module.exports = router;