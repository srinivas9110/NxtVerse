const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Import Route Files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

dotenv.config();

const app = express();

// ===========================================
// ✅ FIX: ROBUST CORS CONFIGURATION
// ===========================================
app.use(cors({
    origin: '*', // Allows Vercel frontend to connect
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'auth-token'] // 👈 CRITICAL: Allows VerseIQ to send the token
}));

app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes Configuration
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', require('./routes/events'));
app.use('/api/studyrooms', require('./routes/studyRooms'));
app.use('/api/hackathons', require('./routes/hackathons'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/arise', require('./routes/arise'));
app.use('/uploads', express.static('uploads'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/verse-iq', require('./routes/verseIQ'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/upload', require('./routes/upload'));

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ message: "NxtVerse Backend Active", status: "OK" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});