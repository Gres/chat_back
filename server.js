const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const ChatController = require('./src/controllers/ChatController.js');
const connectToMongoDB = require('./src/db/mongoose');

const MongoDataProvider = require('./src/db/MongoDataProvider');
const Logger = require('/src/core/Logger');
const {createServer} = require("http");
connectToMongoDB();

if (!process.env.PORT) {
    throw new Error('❌ Please specify the port number');
}
const PORT = process.env.PORT;
let server;
if (process.env.HTTPS) {
    const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    server = https.createServer(credentials);
    server.listen(PORT, () => {
        console.log('HTTPS Server running on port 443');
    });
} else {
    server = createServer();
    server.listen(PORT, () => {
        console.log(`HTTP Server running on port ${PORT}`);
    });
}
const wss = new WebSocket.Server({ server: server });
const chatController = new ChatController(wss, MongoDataProvider, Logger);

console.log(`WebSocket server started on port ${PORT}`);
