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

messageSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'author',
        select: 'username'
    });
    next();
});
messageSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toHexString();
        delete ret._id;

        if (doc.author) {
            ret.userName = doc.author.username;
        }
    }
});

messageSchema.set('toObject', {
    virtuals: true
});
messageSchema.index({ roomId: 1, date: 1 })
module.exports = mongoose.model('Message', messageSchema);