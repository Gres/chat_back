
class DataProvider {
    constructor() {
        this.rooms = [
            { id: 1, name: 'General', players: 5 },
            { id: 2, name: 'Game Room 1', players: 3 },
            { id: 3, name: 'Test', players: 3 },
            { id: 4, name: 'Null room', players: 0 },
        ];

        this.roomUsers = {
            2: ['userId1', 'userId2'],
            1: ['userId1']
        };

        this.messages = {
            1: [{ author: 'User1', text: 'Hello 1', date: '2023-12-19T14:15:13.599Z', id: 1 }],
            2: [{ author: 'User1', text: 'Hello 2', date: '2023-12-19T14:15:13.599Z', id: 1 }]
        };
    }

    getRooms() {
        return this.rooms;
    }

    joinRoom(roomId, userId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        if (room.players >= 10) {
            throw new Error('Room is full');
        }

        if (!this.roomUsers[roomId]) {
            this.roomUsers[roomId] = [];
        }
        if (!this.roomUsers[roomId].includes(userId)) {
            this.roomUsers[roomId].push(userId);
            room.players += 1;
        }
    }

    // Создание новой комнаты
    createRoom(name, userId) {
        const newRoom = { id: this.rooms.length + 1, name, players: 1 };
        this.rooms.push(newRoom);
        this.roomUsers[newRoom.id] = [userId];
        return newRoom;
    }

    setRoomName(roomId, newName) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        room.name = newName;
    }

    leaveRoom(roomId, userId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || !this.roomUsers[roomId]) {
            throw new Error('Room not found');
        }
        const userIndex = this.roomUsers[roomId].indexOf(userId);
        if (userIndex === -1) {
            throw new Error('User not found in room');
        }

        this.roomUsers[roomId].splice(userIndex, 1);
        room.players -= 1;
        if (room.players === 0) {
            const roomIndex = this.rooms.indexOf(room);
            this.rooms.splice(roomIndex, 1);
            delete this.roomUsers[roomId];
        }
    }

    getRoomUsers(roomId) {
        return this.roomUsers[roomId] || [];
    }

    sendMessage(roomId, userId, text) {
        if (!this.messages[roomId]) {
            this.messages[roomId] = [];
        }
        const message = { author: userId, text, date: new Date(), id: this.messages[roomId].length + 1};
        this.messages[roomId].push(message);
    }

    getMessages(roomId) {
        return this.messages[roomId] || [];
    }
}

module.exports = new DataProvider();
