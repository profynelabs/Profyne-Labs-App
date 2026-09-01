const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Worklog = require('./models/Worklog');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'profyne_secret_key_2026';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Static Folders
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File Upload Configuration (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/profyne_db';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// ==================== AUTHENTICATION API ====================

// 1. Register New Member / Director
app.post('/api/auth/register', upload.single('avatar'), async (req, res) => {
    try {
        const { name, email, password, role, designation, phone } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'ইমেইলটি ইতোমধ্যে ব্যবহৃত হয়েছে।' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const avatar = req.file ? req.file.filename : 'default-avatar.png';

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'member',
            designation: designation || 'Team Member',
            phone,
            avatar
        });

        await newUser.save();
        res.status(201).json({ message: 'রেজিস্ট্রেশন সফল হয়েছে!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি।' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'ভুল পাসওয়ার্ড!' });

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, role: user.role, avatar: user.avatar } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== WORKLOG & DASHBOARD API ====================

// Get All Members for Director Dashboard
app.get('/api/director/members', async (req, res) => {
    try {
        const members = await User.find({ role: 'member' }).select('-password');
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = await Worklog.find({ date: today });

        const data = members.map(member => {
            const log = todayLogs.find(l => l.userId.toString() === member._id.toString());
            return {
                ...member._doc,
                status: log ? log.status : 'Not Checked-In',
                checkInTime: log ? log.checkInTime : 'N/A'
            };
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check-In for Member
app.post('/api/worklog/check-in', async (req, res) => {
    try {
        const { userId } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        let log = await Worklog.findOne({ userId, date: today });
        if (log) {
            return res.status(400).json({ message: 'আজকের চেক-ইন ইতোমধ্যে সম্পন্ন হয়েছে!' });
        }

        log = new Worklog({
            userId,
            date: today,
            checkInTime: now,
            status: 'Checked-In'
        });

        await log.save();
        res.json({ message: 'চেক-ইন সফল হয়েছে!', log });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== HTML ROUTES ====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/director-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'director-dashboard.html')));
app.get('/member-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'member-dashboard.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));