const WebSocket = require('ws');
const ChatController = require('./src/ChatController.js');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });
const chatController = new ChatController(wss);

console.log('WebSocket server started on port 8080');
