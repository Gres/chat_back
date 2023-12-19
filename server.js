const WebSocket = require('ws');
const ChatController = require('./src/controllers/ChatController.js');
const connectToMongoDB = require('./src/db/mongoose');
const PORT = process.env.PORT || 8080;
const chatController = new ChatController({ port: PORT  });
connectToMongoDB();
console.log(`WebSocket server started on port ${PORT}`);
