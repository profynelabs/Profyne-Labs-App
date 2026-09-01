const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['director', 'member'], default: 'member' },
    designation: { type: String, default: 'Team Member' },
    phone: { type: String },
    avatar: { type: String, default: 'default-avatar.png' },
    joinedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);