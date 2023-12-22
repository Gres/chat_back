const Room = require('../models/Room');
const User = require('../models/User');
const RoomMembership = require('../models/RoomMembership');
const Message = require('../models/Message');

class MongoDataProvider {
    async getUserByToken(token) {
        let user = JSON.parse(atob(token.split('.')[1]));
        let email = user.email
        let username = user['cognito:username']
        return this.getUser(email, username);
    }
    async getUserById(id) {
        return User.findById(id);
    }
    async getActiveRoom(userId) {
        const membership = await RoomMembership.findOne({ userId }).populate('roomId');
        if (!membership) {
            return null;
        }
        return membership.roomId;
    }
    async getRooms() {
        const roomsWithCounts = await Room.aggregate([

            {
                $lookup: {
                    from: 'roommemberships',
                    localField: '_id',
                    foreignField: 'roomId',
                    as: 'memberships'
                }
            },

            {
                $addFields: {
                    players: { $size: '$memberships' },
                    id: '$_id'
                }
            },
            {
                $project: {
                    memberships: 0
                }
            }
        ]);

        return roomsWithCounts;
    }

    async joinRoom(roomId, userId) {

        const room = await Room.findById(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        const membersCount = await RoomMembership.countDocuments({ roomId });
        if (membersCount >= 10) {
            throw new Error('Room is full');
        }
        const existingMembership = await RoomMembership.findOne({ userId, roomId });

        if (!existingMembership) {
            const membership = new RoomMembership({roomId, userId});
            await membership.save();
        }

    }

    async getUser(email, username) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // throw new Error('User already exists');
            return existingUser
        }

        const newUser = new User({ email, username });
        await newUser.save();
        return newUser;
    }
    async createRoom(name, userId) {
        //check if room exists with same name
        const existingRoom = await Room.findOne({ name });
        if (existingRoom) {
            // throw new Error('User already exists');
            return existingRoom
        }
        const newRoom = new Room({ name, authorId: userId });
        await newRoom.save();

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
        const membership = await RoomMembership.findOne({ roomId, userId: userId });
        if (membership) {
            await membership.remove();
        }

        const countMembers = await RoomMembership.countDocuments({ roomId });
        if (countMembers === 0) {
            setTimeout(async () => {
                const recheckCount = await RoomMembership.countDocuments({ roomId });
                if (recheckCount === 0) {
                    const room = await Room.findById(roomId);
                    if (room) {
                        await room.remove();
                        console.log(`Room ${roomId} deleted`);
                    }
                }
            }, 20000);
        }
    }

    async getRoomUsers(roomId) {
        const memberships = await RoomMembership.find({ roomId }).populate('userId');
        return memberships.map(m => m.userId);
    }

    async sendMessage(roomId, userId, text) {
        const message = new Message({ roomId, author: userId, text });
        await message.save();
    }

    async getMessages(roomId) {
        return Message.find({ roomId });
    }
}

module.exports = new MongoDataProvider();
