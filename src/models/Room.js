const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({

    name: { type: String, required: true },
    players: { type: Number, default: 0 },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
roomSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toHexString();
        delete ret._id;

    }
});

roomSchema.set('toObject', {
    virtuals: true
});
module.exports = mongoose.model('Room', roomSchema);