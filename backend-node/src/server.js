require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

async function startServer() {
    try {
        // Test DB Connection
        await sequelize.authenticate();
        console.log('✅ Database connected successfully.');

        // Sync Models (Use migrations in production, sync for dev)
        // await sequelize.sync({ alter: true }); 

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        process.exit(1);
    }
}

startServer();
