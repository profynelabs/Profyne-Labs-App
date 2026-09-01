const mongoose = require('mongoose');

const worklogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    tasks: { type: String },
    status: { type: String, enum: ['Checked-In', 'Completed', 'Absent'], default: 'Checked-In' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Worklog', worklogSchema);