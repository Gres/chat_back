// dataProvider.js

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
            1: [{ author: 'User1', text: 'Hello' }],
            2: [{ author: 'User1', text: 'Hello' }]
        };
    }

    // Получение списка комнат
    getRooms() {
        return this.rooms;
    }

    // Добавление пользователя в комнату
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

    // Установка нового названия комнаты
    setRoomName(roomId, newName) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        room.name = newName;
    }

    // Пользователь покидает комнату
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

    // Получение пользователей комнаты
    getRoomUsers(roomId) {
        return this.roomUsers[roomId] || [];
    }

    // Отправка сообщения в комнату
    sendMessage(roomId, userId, text) {
        if (!this.messages[roomId]) {
            this.messages[roomId] = [];
        }
        const message = { author: userId, text };
        this.messages[roomId].push(message);
    }

    // Получение сообщений комнаты
    getMessages(roomId) {
        return this.messages[roomId] || [];
    }
}

module.exports = new DataProvider();
