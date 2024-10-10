const redis = require("redis");
const { promisify } = require('util');

const redisClient = redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
});



const setAsync = promisify(redisClient.set).bind(redisClient);
const getAsync = promisify(redisClient.get).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
const incrAsync = promisify(redisClient.incr).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);

module.exports = {
    redisClient,
    setAsync,
    getAsync,
    delAsync,
    incrAsync,
    expireAsync,
};
