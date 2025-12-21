const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = "nxtverse_super_secret_key_123"; // Must match what is in auth.js

const fetchUser = async (req, res, next) => {
    // 1. Get the token from the header
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);

        // 🛠️ SMART FIX: Check if 'user' exists, otherwise use 'data' directly
        if (data.user) {
            req.user = data.user;
        } else {
            req.user = data;
        }

        // Now this will work safely
        await User.findByIdAndUpdate(req.user.id, { lastActive: Date.now() });

        next();
    } catch (error) {
        console.error("Middleware Error:", error.message);
        res.status(401).send({ error: "Please authenticate using a valid token" });
    }
}

module.exports = fetchUser;