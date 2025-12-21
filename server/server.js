const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Import Route Files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users'); // Import users route nicely

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));


// Routes Configuration
app.use('/api/auth', authRoutes);  // For Signup, Login, Get User
app.use('/api/users', userRoutes); // For fetching global network list
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

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});