const mongoose = require('mongoose');

const dbConnectionURL = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    db: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: process.env.DB_OPTIONS
};
const connectToMongoDB = async () => {
    try {
        const fullDbUrl = `mongodb://${dbConnectionURL.host}:${dbConnectionURL.port}/${dbConnectionURL.db}`;

        await mongoose.connect(fullDbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Connected to MongoDB on ${dbConnectionURL.host}:${dbConnectionURL.port}/${dbConnectionURL.db}`);
    } catch (error) {
        console.error(error);
        console.error(`Error connecting to MongoDB: ${error.message}`);
    }
};

module.exports = connectToMongoDB;