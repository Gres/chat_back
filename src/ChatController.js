const WebSocket = require('ws');
const DataProvider = require('./dataProvider');
const Logger = require('./Logger');

const MessageType = {
    JOIN_ROOM: 'joinRoom',
    LEAVE_ROOM: 'leaveRoom',
    CREATE_ROOM: 'createRoom',
    SEND_MESSAGE: 'sendMessage',
    GET_ROOMS: 'getRooms',
    SET_ROOM_NAME: 'setRoomName',
    GET_MESSAGES: 'getMessages',
    GET_ROOM_USERS: 'getRoomUsers',
    RESPONSE: 'response',
    ERROR: 'error'
};

class ChatController {
    constructor(server, logger = Logger) {
        this.wss = new WebSocket.Server(server);
        this.dataProvider = DataProvider;
        this.clients = new Map();
        this.logger = logger;

        this.wss.on('connection', (ws) => {
            this.logger.log('New connection established', 'info', '🔗');
            this.clients.set(ws, {});

            ws.on('message', (message) => this.handleMessage(ws, message));
            ws.on('close', () => this.handleClose(ws));
        });
    }

    async handleMessage(ws, message) {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            this.sendMessage(ws, MessageType.ERROR, { error: 'Invalid message format' }, MessageType.ERROR);
            this.logger.log('Invalid message format', 'error', '🚫');
            return;
        }

        switch (data.type) {
            case MessageType.JOIN_ROOM:
                await this.joinRoom(ws, data);
                break;
            case MessageType.LEAVE_ROOM:
                await this.leaveRoom(ws, data);
                break;
            case MessageType.CREATE_ROOM:
                await this.createRoom(ws, data);
                break;
            case MessageType.SEND_MESSAGE:
                await this.sendMessageToRoom(ws, data);
                break;
            case MessageType.GET_ROOMS:
                await this.getRooms(ws);
                break;
            case MessageType.SET_ROOM_NAME:
                await this.setRoomName(ws, data);
                break;
            case MessageType.GET_MESSAGES:
                await this.getMessages(ws, data);
                break;
            case MessageType.GET_ROOM_USERS:
                await this.getRoomUsers(ws, data);
                break;
            default:
                this.sendMessage(ws, MessageType.ERROR, { error: 'Unknown command' }, MessageType.ERROR);
                this.logger.log('Unknown command', 'error', '❓');
        }
    }

    async joinRoom(ws, data) {
        try {
            await this.dataProvider.joinRoom(data.roomId, data.userId);
            this.clients.set(ws, { userId: data.userId, roomId: data.roomId });
            this.clients.forEach((clientData, client) => {
                if (client.readyState === WebSocket.OPEN && clientData.roomId === data.roomId) {
                    this.sendMessage(client, MessageType.RESPONSE, { success: true,message: 'Joined room', data:{roomId: clientData.roomId, userId: data.userId} }, MessageType.JOIN_ROOM);
                }
            });
            this.logger.log(`User ${data.userId} joined room ${data.roomId}`, 'info', '🚪');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.JOIN_ROOM);
            this.logger.log(`Join room failed: ${error.message}`, 'error', '🚫');
        }
    }

    async leaveRoom(ws, data) {
        try {
            await this.dataProvider.leaveRoom(data.roomId, data.userId);
            this.clients.forEach((clientData, client) => {
                if (client.readyState === WebSocket.OPEN && clientData.roomId === data.roomId) {
                    this.sendMessage(client, MessageType.RESPONSE, { success: true,message:'Left room', data:{roomId: clientData.roomId, userId: data.userId} }, MessageType.LEAVE_ROOM);
                }
            });
            this.clients.set(ws, { userId: data.userId, roomId: null });

            this.logger.log(`User ${data.userId} left room ${data.roomId}`, 'info', '🚶‍♂️');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.LEAVE_ROOM);
            this.logger.log(`Leave room failed: ${error.message}`, 'error', '🚫');
        }
    }

    async createRoom(ws, data) {
        try {
            const newRoom = await this.dataProvider.createRoom(data.name, data.userId);
            this.clients.forEach((clientData, client) => {
                if (client.readyState === WebSocket.OPEN) {
                    this.sendMessage(client, MessageType.RESPONSE, { success: true, data: newRoom }, MessageType.CREATE_ROOM);
                }
            });
            this.logger.log(`Room ${data.name} created by user ${data.userId}`, 'info', '🏗️');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.CREATE_ROOM);
            this.logger.log(`Create room failed: ${error.message}`, 'error', '🚫');
        }
    }

    async sendMessageToRoom(ws, data) {
        try {
            await this.dataProvider.sendMessage(data.roomId, data.userId, data.text);
            const messages = await this.dataProvider.getMessages(data.roomId);

            this.clients.forEach((clientData, client) => {
                if (client.readyState === WebSocket.OPEN && clientData.roomId === data.roomId) {
                    this.sendMessage(client, MessageType.RESPONSE, { success: true, data: messages }, MessageType.SEND_MESSAGE);
                }
            });

            this.logger.log(`Message sent to room ${data.roomId} by user ${data.userId}`, 'info', '💬');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.SEND_MESSAGE);
            this.logger.log(`Send message failed: ${error.message}`, 'error', '🚫');
        }
    }

    async getRooms(ws) {
        try {
            const rooms = await this.dataProvider.getRooms();
            this.sendMessage(ws, MessageType.RESPONSE, { success: true, data: rooms }, MessageType.GET_ROOMS);
            this.logger.log('Requested list of rooms', 'info', '📜');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.GET_ROOMS);
            this.logger.log(`Get rooms failed: ${error.message}`, 'error', '🚫');
        }
    }

    async setRoomName(ws, data) {
        try {
            await this.dataProvider.setRoomName(data.roomId, data.newName);
            this.clients.forEach((clientData, client) => {
                if (client.readyState === WebSocket.OPEN && clientData.roomId === data.roomId) {
                    this.sendMessage(client, MessageType.RESPONSE, { success: true, message: 'Room name updated' }, MessageType.SET_ROOM_NAME);
                }
            });
            this.logger.log(`Room ${data.roomId} name changed to ${data.newName}`, 'info', '✏️');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.SET_ROOM_NAME);
            this.logger.log(`Set room name failed: ${error.message}`, 'error', '🚫');
        }
    }

    async getMessages(ws, data) {
        try {
            const messages = await this.dataProvider.getMessages(data.roomId);
            this.sendMessage(ws, MessageType.RESPONSE, { success: true, data: messages }, MessageType.GET_MESSAGES);
            this.logger.log(`Requested messages for room ${data.roomId}`, 'info', '📩');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.GET_MESSAGES);
            this.logger.log(`Get messages failed: ${error.message}`, 'error', '🚫');
        }
    }

    async getRoomUsers(ws, data) {
        try {
            const users = await this.dataProvider.getRoomUsers(data.roomId);
            this.sendMessage(ws, MessageType.RESPONSE, { success: true, data: users }, MessageType.GET_ROOM_USERS);
            this.logger.log(`Requested user list for room ${data.roomId}`, 'info', '👥');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.GET_ROOM_USERS);
            this.logger.log(`Get room users failed: ${error.message}`, 'error', '🚫');
        }
    }

    async handleClose(ws) {
        const clientInfo = this.clients.get(ws);
        if (clientInfo && clientInfo.roomId) {
            try {
                await this.dataProvider.leaveRoom(clientInfo.roomId, clientInfo.userId);

                this.wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && this.clients.get(client).roomId === clientInfo.roomId) {
                        this.sendMessage(client, MessageType.RESPONSE, { success: true, message: 'User left room', data:{roomId: clientInfo.roomId, userId: clientInfo.userId}  }, MessageType.LEAVE_ROOM);
                    }
                });

                this.logger.log(`User ${clientInfo.userId} left room ${clientInfo.roomId} on disconnect`, 'info', '🚪');
            } catch (error) {
                this.logger.log(`Error handling leave room on disconnect: ${error.message}`, 'error', '🚫');
            }
        }

        this.clients.delete(ws);
        this.logger.log('Connection closed', 'info', '🔌');
    }

    sendMessage(ws, type, data, action) {
        const message = { type, action, ...data };
        ws.send(JSON.stringify(message));
    }
}

module.exports = ChatController;
