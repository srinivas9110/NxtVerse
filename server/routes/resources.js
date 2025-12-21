const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fetchUser = require('../middleware/fetchUser'); // Ensure filename casing matches
const Resource = require('../models/Resource');

// 1. Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nxtverse_resources',
        resource_type: 'auto',
    },
});

const upload = multer({ storage: storage });

// --- ROUTES ---

// 1. GET ALL
router.get('/fetchall', fetchUser, async (req, res) => {
    try {
        const resources = await Resource.find().sort({ createdAt: -1 });
        res.json(resources);
    } catch (error) { res.status(500).send("Server Error"); }
});

// 2. CREATE FOLDER
router.post('/addfolder', fetchUser, async (req, res) => {
    try {
        const { name, parentId, restrictedTo } = req.body;
        const folder = new Resource({
            name,
            type: 'folder',
            parentId: parentId || null,
            restrictedTo: restrictedTo || 'ALL', // 👈 Saves the restriction
            uploadedBy: req.user.id
        });
        const savedFolder = await folder.save();
        res.json(savedFolder);
    } catch (error) { res.status(500).send("Server Error"); }
});

// 3. UPLOAD FILE
router.post('/uploadfile', fetchUser, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const { parentId, restrictedTo } = req.body;

        const file = new Resource({
            name: req.file.originalname,
            type: 'file',
            url: req.file.path,
            parentId: parentId === 'null' ? null : parentId,
            restrictedTo: restrictedTo || 'ALL', // 👈 Saves the restriction
            uploadedBy: req.user.id
        });

        const savedFile = await file.save();
        res.json(savedFile);
    } catch (error) { res.status(500).send("Upload Error"); }
});

// 4. DELETE
router.delete('/delete/:id', fetchUser, async (req, res) => {
    try {
        // Optional: Logic to delete children if it's a folder could go here
        await Resource.findByIdAndDelete(req.params.id);
        res.json({ success: "Deleted" });
    } catch (error) { res.status(500).send("Server Error"); }
});

module.exports = router;