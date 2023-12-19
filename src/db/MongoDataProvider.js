const Room = require('../models/Room');
const User = require('../models/User');
const RoomMembership = require('../models/RoomMembership');
const Message = require('../models/Message');

class MongoDataProvider {
    async getRooms() {
        return Room.find();
    }

    async joinRoom(roomId, userId) {
        // Проверяем, существует ли комната
        const room = await Room.findById(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        // Проверяем, не превышен ли лимит пользователей в комнате
        const membersCount = await RoomMembership.countDocuments({ roomId });
        if (membersCount >= 10) {
            throw new Error('Room is full');
        }
        const user = await this.getUser(userId)
        // Добавляем пользователя в комнату
        const membership = new RoomMembership({ roomId, userId:user._id });
        await membership.save();

        // Увеличиваем количество игроков в комнате
        room.players += 1;
        await room.save();
    }
    async getUser(email, username) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // throw new Error('User already exists');
            return existingUser
        }

        const newUser = new User({ email, username:email });
        await newUser.save();
        return newUser;
    }
    async createRoom(name, userId) {
        const user = await this.getUser(userId)

        const newRoom = new Room({ name, players: 1, authorId: user._id });
        await newRoom.save();

        const membership = new RoomMembership({ roomId: newRoom._id, userId:user._id });
        await membership.save();

        return newRoom;
    }

    async setRoomName(roomId, newName) {
        const room = await Room.findById(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        room.name = newName;
        await room.save();
    }

    async leaveRoom(roomId, userId) {
        let user = await this.getUser(userId)
        const membership = await RoomMembership.findOne({ roomId, userId: user._id });
        if (!membership) {
            throw new Error('User not found in room');
        }

        await membership.remove();

        const room = await Room.findById(roomId);
        room.players -= 1;
        if (room.players === 0) {
            await room.remove();
        } else {
            await room.save();
        }
    }

    async getRoomUsers(roomId) {
        const memberships = await RoomMembership.find({ roomId }).populate('userId');
        return memberships.map(m => m.userId);
    }

    async sendMessage(roomId, userId, text) {
        const user = await this.getUser(userId)
        const message = new Message({ roomId, author: user._id, text });
        await message.save();
    }

    async getMessages(roomId) {
        return Message.find({ roomId });
    }
}

module.exports = new MongoDataProvider();
