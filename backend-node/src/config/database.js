const config = require('./index');

// Helper to determine if SSL should be enforced
// If explicitly set in env OR if we are connecting to a remote host (not localhost)
const isRemoteHost = (host) => {
    return host && host !== '127.0.0.1' && host !== 'localhost' && !host.startsWith('192.168.');
};

const shouldUseSSL = config.db.ssl || isRemoteHost(config.db.host) || config.app.isProduction;

const dbConfig = {
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: config.app.isProduction ? false : console.log,
};

// Apply SSL options if needed
if (shouldUseSSL) {
    console.log(`🔒 Enabling SSL for database connection to ${config.db.host}`);
    dbConfig.dialectOptions = {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    };
} else {
    console.log(`🔓 Using plain (non-SSL) database connection to ${config.db.host}`);
}

module.exports = {
    development: dbConfig,
    test: {
        ...dbConfig,
        database: config.db.name + '_test',
    },
    production: dbConfig
};
