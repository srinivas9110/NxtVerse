const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected..."))
    .catch(err => console.log(err));

const StudyRoomSchema = new mongoose.Schema({}, { strict: false });
const StudyRoom = mongoose.model('StudyRoom', StudyRoomSchema);

const cleanDB = async () => {
    try {
        await StudyRoom.deleteMany({});
        console.log("🗑️  All Study Rooms have been deleted.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanDB();