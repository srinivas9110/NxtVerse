const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected..."))
    .catch(err => console.log(err));

// Define Group Schema (Simplified)
const GroupSchema = new mongoose.Schema({
    name: String,
    description: String,
    category: String,
    members: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.model('Group', GroupSchema);

const seedData = [
    {
        name: "B.Sc Computer Science Notes",
        description: "Official repository for B.Sc CS study materials, lecture notes, and assignments.",
        category: "B.Sc"
    },
    {
        name: "Internship Drives 2025",
        description: "Common placement resources, resume templates, and interview prep for all students.",
        category: "Common"
    },
    {
        name: "Campus Hackathons Info",
        description: "General discussion and resources for upcoming hackathons.",
        category: "Common"
    },
    {
        name: "B.Tech CS Resources",
        description: "Engineering mathematics and core CS subjects for B.Tech students.",
        category: "B.Tech"
    }
];

const seedDB = async () => {
    try {
        // Clear existing groups to avoid duplicates
        await Group.deleteMany({});
        console.log("🗑️  Cleared old groups...");

        // Insert new ones
        await Group.insertMany(seedData);
        console.log("🌱 Database seeded successfully!");
        console.log("✅ Created: B.Sc Notes, Internship Drives, and more.");

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();