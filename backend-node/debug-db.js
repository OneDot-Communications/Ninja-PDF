require('dotenv').config();
const config = require('./src/config/database');
const { Sequelize } = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

console.log('--- DEBUG: Raw Environment ---');
console.log('POSTGRES_SSL (raw):', process.env.POSTGRES_SSL);
console.log('POSTGRES_SSL (bool):', require('./src/config/index').db.ssl);
console.log('------------------------------');

console.log('--- DEBUG: Database Config ---');
console.log('Environment:', env);
console.log('Host:', dbConfig.host);
console.log('Database:', dbConfig.database);
console.log('User:', dbConfig.username);
console.log('SSL Config:', JSON.stringify(dbConfig.dialectOptions || {}, null, 2));
console.log('------------------------------');

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection successful!');
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        if (error.original) {
            console.error('Original Error:', error.original.message);
        }
    } finally {
        await sequelize.close();
    }
})();
