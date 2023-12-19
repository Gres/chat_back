const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({

    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});
messageSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toHexString();
        delete ret._id;

    }
});

messageSchema.set('toObject', {
    virtuals: true
});

module.exports = mongoose.model('Message', messageSchema);