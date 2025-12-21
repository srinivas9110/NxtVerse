const express = require('express');
const router = express.Router();
const fetchUser = require('../middleware/fetchUser');
const Club = require('../models/Club');
const ClubPost = require('../models/ClubPost');
const Workshop = require('../models/Workshop');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// --- HELPER: Detect Media Type ---
const getMediaType = (url) => {
    if (!url) return 'link';
    if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) return 'image';
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.match(/\.(mp4|webm)$/) != null) return 'video';
    return 'link';
};

// ==========================================
// 1. FETCH & CREATE CLUBS
// ==========================================

// Get All Clubs (Populated for Cards)
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        const clubs = await Club.find()
            .populate('president', 'fullName profilePic')
            .populate('leads', 'fullName');
        res.json(clubs);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// Create Club
router.post('/create', fetchUser, async (req, res) => {
    try {
        const { name, description, category, logo, videoUrl } = req.body;
        const club = new Club({
            name, description, category, logo, videoUrl,
            admin: req.user.id,
            president: req.user.id,
            members: [req.user.id]
        });
        const savedClub = await club.save();
        res.json(savedClub);
    } catch (error) { res.status(500).send("Server Error"); }
});

// ==========================================
// 2. CLUB UPDATES (Video, President) - FIXING YOUR ISSUES
// ==========================================

// 🟢 FIX: Update Club Details (Banner Video)
router.put('/update/:id', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Access Denied");

        const { videoUrl, description } = req.body;
        const newDetails = {};
        if (videoUrl !== undefined) newDetails.videoUrl = videoUrl;
        if (description) newDetails.description = description;

        let club = await Club.findById(req.params.id);
        if (!club) return res.status(404).send("Not Found");

        club = await Club.findByIdAndUpdate(req.params.id, { $set: newDetails }, { new: true });
        res.json(club);
    } catch (err) { res.status(500).send("Update Failed"); }
});

// 🟢 FIX: Assign President (By Email - Matching your Clubs.jsx)
router.post('/assign-president', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Faculty Only");

        const { clubId, studentEmail } = req.body;

        // 1. Find the Student by Email
        const student = await User.findOne({ email: studentEmail });
        if (!student) return res.status(404).json({ message: "Student email not found" });

        // 2. Update Club
        const club = await Club.findById(clubId);
        club.president = student._id;
        await club.save();

        res.json({ message: `Assigned ${student.fullName} as President` });
    } catch (err) { res.status(500).send("Server Error"); }
});

// 🟢 FIX: Remove President
router.put('/remove-president', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Faculty Only");

        const { clubId } = req.body;
        const club = await Club.findById(clubId);

        club.president = undefined; // Remove field
        await club.save();

        res.json({ message: "President removed" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// ==========================================
// 3. CLUB DETAILS & WORKSHOPS
// ==========================================

// Get Single Club (With Dashboard Data)
router.get('/:id', fetchUser, async (req, res) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate('admin', 'fullName')
            .populate('president', 'fullName profilePic'); // Populate President

        const workshops = await Workshop.find({ clubId: req.params.id })
            .populate({
                path: 'attendees.user',
                select: 'fullName collegeId section role profilePic' // For Dashboard
            })
            .populate('organizers', 'fullName');

        res.json({ club, workshops });
    } catch (err) { res.status(500).send("Server Error"); }
});

// ==========================================
// 4. WORKSHOP MANAGEMENT (Dashboard Logic)
// ==========================================

// Assign Organizer (Block Self-Assignment)
router.put('/workshop/:id/organizer', fetchUser, async (req, res) => {
    try {
        const { studentId } = req.body;
        // Block assigning yourself
        if (studentId === req.user.id) return res.status(400).json({ error: "Cannot assign yourself" });

        const workshop = await Workshop.findById(req.params.id);

        // Toggle Logic
        if (workshop.organizers.includes(studentId)) {
            workshop.organizers = workshop.organizers.filter(id => id.toString() !== studentId);
        } else {
            workshop.organizers.push(studentId);
        }
        await workshop.save();

        // Return Data
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

// Add Workshop
router.post('/workshop/add', fetchUser, async (req, res) => {
    try {
        const { title, date, time, venue, description, clubId } = req.body;
        const workshop = new Workshop({
            clubId, title, date, time, venue, description,
            organizers: [req.user.id]
        });
        await workshop.save();
        res.json(workshop);
    } catch (err) { res.status(500).send("Error"); }
});

// Delete Workshop
router.delete('/workshop/:id', fetchUser, async (req, res) => {
    try {
        await Workshop.findByIdAndDelete(req.params.id);
        res.json({ success: "Deleted" });
    } catch (err) { res.status(500).send("Error"); }
});

// Register
router.post('/workshop/:id/register', fetchUser, async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.id);
        if (workshop.attendees.some(a => a.user.toString() === req.user.id)) {
            return res.status(400).json({ message: "Already Registered" });
        }
        workshop.attendees.push({ user: req.user.id });
        await workshop.save();
        res.json({ message: "Registered Successfully" });
    } catch (err) { res.status(500).send("Error"); }
});

// ==========================================
// 5. POSTS (Feed)
// ==========================================

router.get('/:id/posts', fetchUser, async (req, res) => {
    try {
        const posts = await ClubPost.find({ club: req.params.id })
            .populate('postedBy', 'fullName')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) { res.status(500).send("Error"); }
});

router.post('/:id/post', fetchUser, async (req, res) => {
    try {
        const { caption, link } = req.body;
        const type = getMediaType(link);
        const post = new ClubPost({
            club: req.params.id, postedBy: req.user.id, caption, link, mediaType: type
        });
        const savedPost = await post.save();
        const populatedPost = await savedPost.populate('postedBy', 'fullName');
        res.json(populatedPost);
    } catch (err) { res.status(500).send("Error"); }
});

// Configure Cloudinary (It automatically reads from your server .env)
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

router.delete('/post/:id', fetchUser, async (req, res) => {
    try {
        // 1. Find the post first
        const post = await ClubPost.findById(req.params.id);
        if (!post) return res.status(404).send("Post not found");

        // 2. Check if it has an image (and not a video/YouTube link)
        if (post.link && post.mediaType === 'image' && post.link.includes('cloudinary')) {
            // Extract the "public_id" from the URL
            // URL looks like: .../upload/v12345/nxtverse_preset/image_abc123.jpg
            const publicId = post.link.split('/').pop().split('.')[0];

            // Delete from Cloudinary
            await cloudinary.uploader.destroy(publicId);
        }

        // 3. Delete from Database
        await ClubPost.findByIdAndDelete(req.params.id);
        res.json({ success: "Post and Image deleted" });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


module.exports = router;