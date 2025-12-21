const express = require('express');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const HackathonTeam = require('../models/HackathonTeam');
const fetchUser = require('../middleware/fetchUser');
const Announcement = require('../models/Announcement');

// ==========================================
// 1. EVENT MANAGEMENT
// ==========================================

// Get All Events
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        const hacks = await Hackathon.find().sort({ createdAt: -1 });
        res.json(hacks);
    } catch (error) { res.status(500).send("Server Error"); }
});

// Create Event (With Team Constraints)
router.post('/create', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).json({ message: "Access Denied" });

        const { title, description, date, location, image, minTeamSize, maxTeamSize } = req.body;

        const newHack = new Hackathon({
            title, description, date, location, image,
            organizer: req.user.id,
            teamSize: {
                min: minTeamSize || 2,
                max: maxTeamSize || 5
            }
        });

        const savedHack = await newHack.save();

        // Auto-Announce
        await new Announcement({
            message: `⚔️ NEW BATTLE: ${title} announced! Form squads of ${newHack.teamSize.min}-${newHack.teamSize.max}.`,
            type: 'hackathon',
            relatedId: savedHack._id
        }).save();

        res.json(savedHack);
    } catch (error) { res.status(500).send("Server Error"); }
});

// ==========================================
// 2. SQUAD FORGE (Team Management)
// ==========================================

// Get Teams (Includes Requests info for Leaders)
router.get('/:id/teams', fetchUser, async (req, res) => {
    try {
        const teams = await HackathonTeam.find({ hackathonId: req.params.id })
            .populate('leader', 'fullName profilePic')
            .populate('members.user', 'fullName profilePic role')
            .populate('requests.user', 'fullName profilePic') // 👈 Populate applicants so Leader can see names
            .sort({ 'scores.totalScore': -1 });
        res.json(teams);
    } catch (error) { res.status(500).send("Server Error"); }
});

// Create Squad
router.post('/team/create', fetchUser, async (req, res) => {
    try {
        const { hackathonId, name, lookingFor } = req.body;

        // Check if user already has a team in this event
        const existing = await HackathonTeam.findOne({ hackathonId, 'members.user': req.user.id });
        if (existing) return res.status(400).json({ message: "You are already in a squad!" });

        const newTeam = new HackathonTeam({
            name,
            hackathonId,
            leader: req.user.id,
            members: [{ user: req.user.id, role: 'Leader' }],
            lookingFor: lookingFor || []
        });

        const savedTeam = await newTeam.save();
        await Hackathon.findByIdAndUpdate(hackathonId, { $push: { teams: savedTeam._id } });

        res.json(savedTeam);
    } catch (error) { res.status(500).send("Server Error"); }
});

// ==========================================
// 3. APPLICATION SYSTEM (Apply -> Accept)
// ==========================================

// A. APPLY for a Role (Adds to 'requests' array)
router.put('/team/apply/:teamId', fetchUser, async (req, res) => {
    try {
        const { role } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);
        if (!team) return res.status(404).send("Team not found");

        // 1. Check if already in THIS team
        if (team.members.find(m => m.user.toString() === req.user.id)) {
            return res.status(400).json({ message: "You are already in this squad." });
        }

        // 2. Check if already applied
        if (team.requests.find(r => r.user.toString() === req.user.id)) {
            return res.status(400).json({ message: "Application already pending." });
        }

        // 3. Add to Requests
        team.requests.push({ user: req.user.id, role: role });
        await team.save();

        res.json({ success: true, message: "Application Sent! Waiting for Leader." });
    } catch (error) { res.status(500).send("Server Error"); }
});

// B. ACCEPT Applicant (Leader Only)
router.put('/team/accept/:teamId', fetchUser, async (req, res) => {
    try {
        const { applicantId, role } = req.body; // User ID to accept
        const team = await HackathonTeam.findById(req.params.teamId);
        const hackathon = await Hackathon.findById(team.hackathonId);

        // 1. Verify Leader
        if (team.leader.toString() !== req.user.id) return res.status(401).send("Only Leader can accept.");

        // 2. Check Max Team Size
        if (team.members.length >= hackathon.teamSize.max) {
            return res.status(400).json({ message: `Team is full! Max ${hackathon.teamSize.max} members.` });
        }

        // 3. Move from Requests to Members
        team.members.push({ user: applicantId, role: role });

        // Remove from this team's request list
        team.requests = team.requests.filter(r => r.user.toString() !== applicantId);

        await team.save();

        // 4. 🔥 AUTO-CLEANUP: Remove this user's applications from ALL other teams in this Hackathon
        await HackathonTeam.updateMany(
            { hackathonId: team.hackathonId }, // In this event
            { $pull: { requests: { user: applicantId } } } // Remove request
        );

        res.json({ success: true, message: "New Member Recruited!" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// C. REJECT Applicant
router.put('/team/reject/:teamId', fetchUser, async (req, res) => {
    try {
        const { applicantId } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);

        if (team.leader.toString() !== req.user.id) return res.status(401).send("Access Denied");

        // Remove from requests only
        team.requests = team.requests.filter(r => r.user.toString() !== applicantId);
        await team.save();

        res.json({ success: true, message: "Application Rejected" });
    } catch (error) { res.status(500).send("Server Error"); }
});

// ==========================================
// 4. SUBMISSION & GRADING
// ==========================================

// Submit Project
router.post('/team/submit/:teamId', fetchUser, async (req, res) => {
    try {
        const { title, repoLink, liveLink, description } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);

        if (team.leader.toString() !== req.user.id) return res.status(401).send("Leader Only");

        team.project = { title, repoLink, liveLink, description };
        await team.save();

        res.json({ success: true, message: "Project Submitted!" });
    } catch (error) { res.status(500).send("Server Error"); }
});

// Grade Project (Faculty)
router.post('/team/score/:teamId', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Judges Only");

        const { innovation, codeQuality, presentation } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);

        team.scores = {
            innovation, codeQuality, presentation,
            totalScore: innovation + codeQuality + presentation
        };
        await team.save();

        res.json({ success: true, team });
    } catch (error) { res.status(500).send("Server Error"); }
});

// ==========================================
// 5. HOUSEKEEPING
// ==========================================

router.delete('/team/:teamId', fetchUser, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.teamId);
        if (team.leader.toString() !== req.user.id && req.user.role !== 'faculty') return res.status(401).send("Denied");

        await HackathonTeam.findByIdAndDelete(req.params.teamId);
        await Hackathon.findByIdAndUpdate(team.hackathonId, { $pull: { teams: req.params.teamId } });
        res.json({ success: true });
    } catch (error) { res.status(500).send("Server Error"); }
});

router.put('/:id/status', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).send("Denied");
        const hack = await Hackathon.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(hack);
    } catch (error) { res.status(500).send("Server Error"); }
});

router.delete('/:id', fetchUser, async (req, res) => {
    try {
        let hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).send("Not Found");

        // Permission check...
        if (hackathon.organizer.toString() !== req.user.id && req.user.role !== 'faculty') {
            return res.status(401).send("Not Allowed");
        }

        // 1. Delete the Hackathon
        await Hackathon.findByIdAndDelete(req.params.id);

        // 2. 🧹 AUTOMATION: Delete any Announcement linked to this Hackathon
        await Announcement.deleteMany({ relatedHackathonId: req.params.id });

        res.json({ success: "Hackathon and related announcements deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// D. REMOVE MEMBER (Kick) - Leader Only
router.put('/team/removeMember/:teamId', fetchUser, async (req, res) => {
    try {
        const { memberId } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);

        // Permission Check: Only Leader can kick
        if (team.leader.toString() !== req.user.id) {
            return res.status(401).json({ message: "Only the Leader can remove members." });
        }

        // Prevent kicking the Leader (themselves)
        if (memberId === team.leader.toString()) {
            return res.status(400).json({ message: "You cannot kick yourself. Disband the team instead." });
        }

        // Remove from members array
        team.members = team.members.filter(m => m.user.toString() !== memberId);
        await team.save();

        res.json({ success: true, message: "Member removed from squad." });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;