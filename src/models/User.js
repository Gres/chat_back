    const mongoose = require('mongoose');

    const userSchema = new mongoose.Schema({
        username: { type: String, required: true, unique: false },
        email: { type: String, required: true, unique: true },
    });
    userSchema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: function (doc, ret) {
            ret.id = ret._id.toHexString();
            delete ret._id;

        }
    });

    userSchema.set('toObject', {
        virtuals: true
    });

    userSchema.index({ email: 1 });


    module.exports = mongoose.model('User', userSchema);