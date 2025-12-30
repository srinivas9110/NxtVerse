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

// Create Event
router.post('/create', fetchUser, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') return res.status(403).json({ message: "Access Denied" });

        const { title, description, date, location, image, minTeamSize, maxTeamSize } = req.body;

        const newHack = new Hackathon({
            title, description, date, location, image,
            organizer: req.user.id,
            teamSize: {
                min: parseInt(minTeamSize) || 2,
                max: parseInt(maxTeamSize) || 5
            },
            status: 'upcoming'
        });

        const savedHack = await newHack.save();

        await new Announcement({
            message: `⚔️ NEW BATTLE: ${title} announced! Form squads of ${newHack.teamSize.min}-${newHack.teamSize.max}.`,
            type: 'hackathon',
            relatedId: savedHack._id
        }).save();

        res.status(200).json(savedHack);
    } catch (error) { 
        console.error("Create Hackathon Error:", error);
        res.status(500).send("Server Error"); 
    }
});

// ==========================================
// 2. SQUAD FORGE (Team Management)
// ==========================================

router.get('/:id/teams', fetchUser, async (req, res) => {
    try {
        const teams = await HackathonTeam.find({ hackathonId: req.params.id })
            .populate('leader', 'fullName profilePic')
            .populate('members.user', 'fullName profilePic role')
            .populate('requests.user', 'fullName profilePic') 
            .sort({ 'scores.totalScore': -1 });
        res.json(teams);
    } catch (error) { res.status(500).send("Server Error"); }
});

// 🟢 CREATE SQUAD (Enforce Max Roles Strategy)
router.post('/team/create', fetchUser, async (req, res) => {
    try {
        const { hackathonId, name, lookingFor } = req.body;

        // 1. Check if user already has a team
        const existing = await HackathonTeam.findOne({ hackathonId, 'members.user': req.user.id });
        if (existing) return res.status(400).json({ message: "You are already in a squad!" });

        // 2. 🟢 STRATEGY CHECK: Fetch Hackathon Limits
        const hackathon = await Hackathon.findById(hackathonId);
        if (!hackathon) return res.status(404).json({ message: "Event not found" });

        // Leader takes 1 spot, so allowed roles = Max - 1
        const maxRolesAllowed = hackathon.teamSize.max - 1;

        if (lookingFor.length > maxRolesAllowed) {
            return res.status(400).json({ 
                message: `Strategy Error: You can only recruit ${maxRolesAllowed} allies for this mission.` 
            });
        }

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
// 3. APPLICATION SYSTEM
// ==========================================

router.put('/team/apply/:teamId', fetchUser, async (req, res) => {
    try {
        const { role } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);
        if (!team) return res.status(404).send("Team not found");

        if (team.members.find(m => m.user.toString() === req.user.id)) {
            return res.status(400).json({ message: "You are already in this squad." });
        }
        if (team.requests.find(r => r.user.toString() === req.user.id)) {
            return res.status(400).json({ message: "Application already pending." });
        }

        team.requests.push({ user: req.user.id, role: role });
        await team.save();

        res.json({ success: true, message: "Application Sent!" });
    } catch (error) { res.status(500).send("Server Error"); }
});

router.put('/team/accept/:teamId', fetchUser, async (req, res) => {
    try {
        const { applicantId, role } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);
        const hackathon = await Hackathon.findById(team.hackathonId);

        if (team.leader.toString() !== req.user.id) return res.status(401).send("Only Leader can accept.");

        if (team.members.length >= hackathon.teamSize.max) {
            return res.status(400).json({ message: `Team is full! Max ${hackathon.teamSize.max} members.` });
        }

        team.members.push({ user: applicantId, role: role });
        team.requests = team.requests.filter(r => r.user.toString() !== applicantId);

        await team.save();

        await HackathonTeam.updateMany(
            { hackathonId: team.hackathonId }, 
            { $pull: { requests: { user: applicantId } } } 
        );

        res.json({ success: true, message: "New Member Recruited!" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

router.put('/team/reject/:teamId', fetchUser, async (req, res) => {
    try {
        const { applicantId } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);
        if (team.leader.toString() !== req.user.id) return res.status(401).send("Access Denied");

        team.requests = team.requests.filter(r => r.user.toString() !== applicantId);
        await team.save();
        res.json({ success: true, message: "Application Rejected" });
    } catch (error) { res.status(500).send("Server Error"); }
});

// ==========================================
// 4. SUBMISSION & GRADING
// ==========================================

// 🟢 SUBMIT PROJECT (Enforce Min Team Size)
router.post('/team/submit/:teamId', fetchUser, async (req, res) => {
    try {
        const { title, repoLink, liveLink, description } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);
        
        // 1. Fetch Hackathon Rules
        const hackathon = await Hackathon.findById(team.hackathonId);

        if (team.leader.toString() !== req.user.id) return res.status(401).send("Leader Only");

        // 2. 🟢 MINIMUM SIZE CHECK
        if (team.members.length < hackathon.teamSize.min) {
            return res.status(400).json({ 
                message: `Submission Failed: You need at least ${hackathon.teamSize.min} members to enter the arena.` 
            });
        }

        team.project = { title, repoLink, liveLink, description };
        await team.save();

        res.json({ success: true, message: "Project Submitted!" });
    } catch (error) { res.status(500).send("Server Error"); }
});

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

        if (hackathon.organizer.toString() !== req.user.id && req.user.role !== 'faculty') {
            return res.status(401).send("Not Allowed");
        }

        await Hackathon.findByIdAndDelete(req.params.id);
        await Announcement.deleteMany({ relatedHackathonId: req.params.id });
        res.json({ success: "Hackathon deleted" });
    } catch (error) { res.status(500).send("Server Error"); }
});

router.put('/team/removeMember/:teamId', fetchUser, async (req, res) => {
    try {
        const { memberId } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);

        if (team.leader.toString() !== req.user.id) return res.status(401).json({ message: "Only the Leader can remove members." });
        if (memberId === team.leader.toString()) return res.status(400).json({ message: "You cannot kick yourself." });

        team.members = team.members.filter(m => m.user.toString() !== memberId);
        await team.save();

        res.json({ success: true, message: "Member removed from squad." });
    } catch (error) { res.status(500).send("Server Error"); }
});

module.exports = router;