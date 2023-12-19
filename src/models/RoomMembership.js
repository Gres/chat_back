const mongoose = require('mongoose');
const roomMembershipSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RoomMembership', roomMembershipSchema);
