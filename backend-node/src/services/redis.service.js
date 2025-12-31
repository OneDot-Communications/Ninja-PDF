const Redis = require('ioredis');
const config = require('../config');

const redis = new Redis(config.redis.url);

redis.on('error', (err) => {
    console.error('Redis Error:', err);
});

module.exports = redis;
