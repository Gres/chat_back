const WebSocket = require('ws');
const ChatController = require('./src/ChatController.js');
const PORT = process.env.PORT || 8080
const chatController = new ChatController({ port: PORT  });

console.log(`WebSocket server started on port ${PORT}`);
