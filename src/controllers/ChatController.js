const WebSocket = require('ws');
const INACTIVITY_TIMEOUT = parseInt(process.env.INACTIVITY_TIMEOUT) || 300000; // 5 минут по умолчанию


const MessageType = {
    GET_ACTIVE_ROOM: 'getActiveRoom',
    WHO_AM_I: 'whoAmI',
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
    constructor(server, MongoDataProvider, logger) {
        this.wss = server;
        this.dataProvider = MongoDataProvider;
        this.clients = new Map();
        this.logger = logger;

        this.wss.on('connection', (ws) => {
            this.logger.log('New connection established', 'info', '🔗');
            this.clients.set(ws, { lastActivity: Date.now() });

            ws.on('message', (message) => {
                this.clients.get(ws).lastActivity = Date.now();
                this.handleMessage(ws, message).catch(error => {
                    this.logger.log(`Error in handleMessage: ${error.message}`, 'error', '⚠️');
                });
            });
            ws.on('close', () => this.handleClose(ws).catch(error => {
                this.logger.log(`Error in handleClose: ${error.message}`, 'error', '⚠️');
            }));
        });

        setInterval(() => this.checkClientActivity(), INACTIVITY_TIMEOUT);
    }
    checkClientActivity() {
        const now = Date.now();
        this.clients.forEach((clientData, client) => {
            if (now - clientData.lastActivity > INACTIVITY_TIMEOUT) {
                this.handleClose(client).catch(error => {
                    this.logger.log(`Error during client activity check: ${error.message}`, 'error', '⚠️');
                });
            }
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
        let token = data.token;
        if (!token) {
            this.sendMessage(ws, MessageType.ERROR, { error: 'Token not provided' }, MessageType.ERROR);
            this.logger.log('Token not provided', 'error', '🚫');
            return;
        } else {
            try {
                let user = await this.dataProvider.getUserByToken(token);
                if (!user) {
                    this.sendMessage(ws, MessageType.ERROR, { error: 'Invalid token' }, MessageType.ERROR);
                    this.logger.log('Invalid token', 'error', '🚫');
                    return;
                } else {
                    data.userId = user._id;
                }
            } catch (error) {
                this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.ERROR);
                this.logger.log(`Get user by token failed: ${error.message}`, 'error', '🚫');
                return;
            }

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
            case MessageType.GET_ACTIVE_ROOM:
                await this.getActiveRoom(ws, data);
                break;
            case MessageType.GET_MESSAGES:
                await this.getMessages(ws, data);
                break;
            case MessageType.GET_ROOM_USERS:
                await this.getRoomUsers(ws, data);
                break;
            case MessageType.WHO_AM_I:
                await this.whoAmI(ws, data);
                break;
            default:
                this.sendMessage(ws, MessageType.ERROR, { error: 'Unknown command' }, MessageType.ERROR);
                this.logger.log('Unknown command', 'error', '❓');
        }
    }

    async joinRoom(ws, data) {
        try {
            if(this.clients.get(ws).roomId){
                await this.leaveRoom(ws, {roomId: this.clients.get(ws).roomId, userId: data.userId})
            }
            await this.dataProvider.joinRoom(data.roomId, data.userId);
            this.clients.set(ws, { userId: data.userId, roomId: data.roomId });
            this.clients.forEach((clientData, client) => {
                if (client.readyState === WebSocket.OPEN && clientData.roomId === data.roomId) {
                    this.sendMessage(client, MessageType.RESPONSE, { success: true,message: 'Joined room', data:{roomId: clientData.roomId, userId: clientData.userId} }, MessageType.JOIN_ROOM);
                }
            });

            // await this.getActiveRoom(ws, data);
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
                    this.sendMessage(client, MessageType.RESPONSE, { success: true,message:'Left room', data:{roomId: clientData.roomId, userId: clientData.userId} }, MessageType.LEAVE_ROOM);
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
                    this.sendMessage(client, MessageType.RESPONSE, { success: true, data: {
                            roomId: newRoom._id,
                        } }, MessageType.CREATE_ROOM);
                }
            });

            this.logger.log(`Room ${data.name} created by user ${data.userId}`, 'info', '🏗️');
            await this.joinRoom(ws, {roomId: newRoom._id, userId: data.userId});

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
            this.sendMessage(ws, MessageType.RESPONSE, { success: true, data: messages }, MessageType.SEND_MESSAGE);
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

    async getActiveRoom(ws, data) {
        try {
            const room = await this.dataProvider.getActiveRoom(data.userId);
            this.sendMessage(ws, MessageType.RESPONSE, { success: true, data: {room} }, MessageType.GET_ACTIVE_ROOM);
            this.logger.log(`Requested active room for user ${data.userId}`, 'info', '🏠');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.SET_ROOM_NAME);
            this.logger.log(`Set room name failed: ${error.message}`, 'error', '🚫');
        }
    }

    async whoAmI(ws, data) {
        try {
            const user = await this.dataProvider.getUserById(data.userId);
            this.sendMessage(ws, MessageType.RESPONSE, { success: true, data:user }, MessageType.WHO_AM_I);
            this.logger.log(`Requested user info for user ${data.userId}  ${user?.username}`, 'info', '👤');
        } catch (error) {
            this.sendMessage(ws, MessageType.ERROR, { error: error.message }, MessageType.WHO_AM_I);
            this.logger.log(`Get user info failed: ${error.message}`, 'error', '🚫');
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
        try {
            const clientInfo = this.clients.get(ws);
            if (clientInfo && clientInfo.roomId) {
                await this.leaveRoom(ws, clientInfo);
            }

            this.clients.delete(ws);
            this.logger.log('Connection closed or client went offline', 'info', '🔌');
        } catch (error) {
            this.logger.log(`Error in handleClose: ${error.message}`, 'error', '⚠️');
        }
    }


    sendMessage(ws, type, data, action) {
        const message = { type, action, ...data };
        ws.send(JSON.stringify(message));
    }
}

module.exports = ChatController;
