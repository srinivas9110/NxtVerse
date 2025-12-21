const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Club = require('./models/Club');
const Workshop = require('./models/Workshop');

dotenv.config();

const seedWorkshop = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB");

        // 1. Find the Robotics Club
        const roboticsClub = await Club.findOne({ name: "Robotics Club" });

        if (!roboticsClub) {
            console.log("❌ Robotics Club not found. Run seedClubs.js first!");
            process.exit();
        }

        // 2. Create a Dummy Workshop
        const workshop = new Workshop({
            title: "Build Your First Drone",
            description: "A hands-on session where you will learn flight dynamics and assemble a quadcopter from scratch.",
            date: "2025-10-25", // Future date
            time: "10:00 AM - 04:00 PM",
            venue: "Main Auditorium, Block A",
            clubId: roboticsClub._id,
            attendees: [] // Empty start
        });

        await workshop.save();
        console.log(`🎉 Workshop Created for ${roboticsClub.name}!`);
        process.exit();

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedWorkshop();