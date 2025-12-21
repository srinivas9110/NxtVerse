const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const fetchUser = require('../middleware/fetchUser');
require('dotenv').config();

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/ask', fetchUser, async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: "Server Error: API Key missing" });
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are VerseIQ, a helpful AI assistant for college students."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            // --- UPDATED MODEL ID ---
            // 'llama-3.1-8b-instant' is the active, supported model
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "No response generated.";
        res.json({ answer: aiResponse });

    } catch (error) {
        console.error("VerseIQ Error:", error);

        if (error.status === 401) {
            return res.status(401).json({ error: "Invalid API Key." });
        }
        // Handle decommissioned model errors specifically if they happen again
        if (error.status === 400 || error.code === 'model_decommissioned') {
            return res.status(400).json({ error: "AI Model unavailable. Please contact admin." });
        }
        res.status(500).json({ error: "VerseIQ Internal Error" });
    }
});

module.exports = router;