const mongoose = require("mongoose");
const logger = require("../utils/logger");

mongoose.set("strictQuery", true);

const connectToDatabase = async (uri) => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    logger.info(`MongoDB connected (${mongoose.connection.name})`);
    return mongoose.connection;
};

const disconnectFromDatabase = () => mongoose.disconnect();

module.exports = { connectToDatabase, disconnectFromDatabase };
