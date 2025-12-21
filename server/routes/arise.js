const express = require('express');
const router = express.Router();
const Dungeon = require('../models/Dungeon');
const User = require('../models/User');
const fetchUser = require('../middleware/fetchUser');

const LEVEL_CAP = 40;
const XP_PER_LEVEL = 1000;

// @route   GET /api/arise/dungeons
router.get('/dungeons', fetchUser, async (req, res) => {
    try {
        const dungeons = await Dungeon.find().sort({ createdAt: -1 });
        // Send player stats too so frontend can show "Already Cleared" status
        const user = await User.findById(req.user.id).select('clearedDungeons rank level');
        res.json({ dungeons, playerStats: user });
    } catch (error) { res.status(500).send("System Error"); }
});

// @route   POST /api/arise/deploy (Architect Only)
router.post('/deploy', fetchUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'faculty') return res.status(403).send("System Alert: You are not the Architect.");

        const { title, rank, xpReward, questions } = req.body;
        const dungeon = new Dungeon({ title, rank, xpReward, questions });
        await dungeon.save();
        res.json({ success: true, dungeon });
    } catch (error) { res.status(500).send("System Error"); }
});

// @route   PUT /api/arise/clear/:id (The XP Calculation)
router.put('/clear/:id', fetchUser, async (req, res) => {
    try {
        const { score, totalQuestions } = req.body;
        const user = await User.findById(req.user.id);
        const dungeon = await Dungeon.findById(req.params.id);

        if (!dungeon) return res.status(404).send("Gate not found.");

        // 1. FARMING CHECK: If already cleared, 0 XP (Revision Mode)
        if (user.clearedDungeons.includes(req.params.id)) {
            return res.json({ success: true, msg: "Gate Conquered. No XP granted (Revision Mode)." });
        }

        // 2. SURVIVAL CHECK: Need 50% score to survive
        const accuracy = score / totalQuestions;
        if (accuracy < 0.5) {
            return res.json({ success: false, msg: "YOU DIED. (Score too low)" });
        }

        // 3. XP CALCULATION (With Rank Penalties)
        let finalXp = Math.floor(dungeon.xpReward * accuracy);

        // Nerf High Rankers doing Low Rank Gates
        if (user.rank === 'S-Rank' && dungeon.rank === 'E-Rank') finalXp = 0;
        else if (user.rank === 'A-Rank' && dungeon.rank === 'E-Rank') finalXp = Math.floor(finalXp * 0.1);

        // Job Change Cap
        if (user.level >= LEVEL_CAP && user.jobClass === 'None') finalXp = 0;

        // 4. UPDATE STATS
        user.xp += finalXp;
        user.clearedDungeons.push(dungeon._id);

        // Perfect Clear Bonus (Extract Shadow)
        if (accuracy === 1.0) user.shadows += 1;

        // Level Up Logic
        const newLevel = Math.floor(user.xp / XP_PER_LEVEL) + 1;
        if (newLevel > user.level) {
            user.level = newLevel;
            // Rank Up Thresholds
            if (user.level >= 10) user.rank = "D-Rank";
            if (user.level >= 20) user.rank = "C-Rank";
            if (user.level >= 30) user.rank = "B-Rank";
            if (user.level >= 50) user.rank = "A-Rank";
            if (user.level >= 80) user.rank = "S-Rank";
        }

        await user.save();
        res.json({
            success: true,
            xpGained: finalXp,
            newRank: user.rank,
            shadows: user.shadows,
            msg: finalXp > 0 ? "Gate Cleared!" : "Gate Cleared (Rank Penalty Applied)"
        });

    } catch (error) { res.status(500).send("System Error"); }
});

// @route   GET /api/arise/leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const hunters = await User.find({ role: 'student' })
            .sort({ xp: -1 })
            .limit(10)
            .select('fullName xp rank level shadows');
        res.json(hunters);
    } catch (error) { res.status(500).send("System Error"); }
});

module.exports = router;