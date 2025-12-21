const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Club = require('./models/Club'); // Ensure you created this model in the previous step

dotenv.config();

// Club Data
const clubs = [
    {
        name: "Robotics Club",
        description: "Building the future, one drone at a time. Join us for hands-on workshops on Drones, IoT, and Bots.",
        logo: "https://cdn-icons-png.flaticon.com/512/1693/1693746.png" // Free icon URL
    },
    {
        name: "Entrepreneurship Club",
        description: "Turning ideas into reality. Guest lectures, startup pitches, and business workshops.",
        logo: "https://cdn-icons-png.flaticon.com/512/2910/2910768.png"
    },
    {
        name: "Arts Club",
        description: "Unleashing creativity. Painting, sketching, digital art, and gallery showcases.",
        logo: "https://cdn-icons-png.flaticon.com/512/1903/1903803.png"
    },
    {
        name: "Sports Club",
        description: "Foster team spirit and fitness. Cricket, Football, Badminton, and intra-college tournaments.",
        logo: "https://cdn-icons-png.flaticon.com/512/857/857455.png"
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB");

        // Loop through and create if they don't exist
        for (let clubData of clubs) {
            const exists = await Club.findOne({ name: clubData.name });
            if (!exists) {
                await new Club(clubData).save();
                console.log(`Created: ${clubData.name}`);
            } else {
                console.log(`Skipped: ${clubData.name} (Already exists)`);
            }
        }

        console.log("🎉 Seeding Complete!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();