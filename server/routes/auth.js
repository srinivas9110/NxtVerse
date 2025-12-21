const express = require('express');
const router = express.Router(); // ✅ Router is defined here
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchUser = require('../middleware/fetchUser');

// Secret Key
const JWT_SECRET = "nxtverse_super_secret_key_123";

// @route   POST /api/auth/signup
// @desc    Register a new user (Student OR Faculty)
router.post('/signup', async (req, res) => {
    try {
        const { fullName, collegeId, email, password, section } = req.body;
        const upperId = collegeId.toUpperCase();

        // --- 1. ID VALIDATION & ROLE DETECTION ---
        let role = 'student';
        let detectedCourse = 'Unknown';

        // Regex Patterns
        const studentPattern = /^N\d{2}H\d{2}[AB]\d{4}$/i; // e.g. N24H01A0268
        const facultyPattern = /^NW000\d{4}$/i;            // e.g. NW0001234

        if (facultyPattern.test(upperId)) {
            // ✅ It is a Faculty!
            role = 'faculty';
            detectedCourse = 'Computer Science Dept';
        } else if (studentPattern.test(upperId)) {
            // ✅ It is a Student!
            role = 'student';
            if (upperId.includes("H01A")) detectedCourse = "B.Sc Computer Science";
            else if (upperId.includes("H01B")) detectedCourse = "B.Tech Computer Science";
        } else {
            return res.status(400).json({ message: "Invalid ID Format. Use Student ID (N24...) or Faculty ID (NW000...)" });
        }

        // 2. Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { collegeId: upperId }] });
        if (existingUser) return res.status(400).json({ message: "User already exists with this Email or ID" });

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. DETERMINE SECTION
        // If Faculty, force section to "Faculty". If Student, use input or default to "A"
        const finalSection = role === 'faculty' ? "Faculty" : (section || "A");

        // 5. Create User
        const newUser = new User({
            fullName,
            collegeId: upperId,
            email,
            password: hashedPassword,
            course: detectedCourse,
            section: finalSection, // ✅ Saves "Faculty" or "A/B/C"
            role: role
        });

        await newUser.save();
        res.status(201).json({ message: `Welcome, ${role === 'faculty' ? 'Professor' : 'Student'}!` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid Credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid Credentials" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '4d' }
        );

        res.json({
            message: "Login Successful",
            token,
            user: { name: user.fullName, role: user.role }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   GET /api/auth/getuser
// @desc    Get logged in user details
router.get('/getuser', fetchUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   PUT /api/auth/update
// @desc    Update Profile
router.put('/update', fetchUser, async (req, res) => {
    try {
        const { fullName, section, bio, links, skills, projects, achievements } = req.body;
        const newUserData = {};

        if (fullName) newUserData.fullName = fullName;
        if (section) newUserData.section = section;
        if (bio) newUserData.bio = bio;
        if (links) newUserData.links = links;
        if (skills) newUserData.skills = skills;
        if (projects) newUserData.projects = projects;
        if (achievements) newUserData.achievements = achievements;

        let user = await User.findByIdAndUpdate(req.user.id, { $set: newUserData }, { new: true }).select("-password");
        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/auth/getuser/:id
// @desc    Get a specific user's public profile by ID
router.get('/getuser/:id', fetchUser, async (req, res) => {
    try {
        // Fetch user but EXCLUDE the password
        const user = await User.findById(req.params.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/auth/active-count
// @desc    Count users active in last 5 minutes
router.get('/active-count', async (req, res) => {
    try {
        // Calculate time 5 minutes ago
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        // Count documents where lastActive >= 5 mins ago
        const count = await User.countDocuments({ lastActive: { $gte: fiveMinutesAgo } });

        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;