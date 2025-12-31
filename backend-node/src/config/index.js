require('dotenv').config();

const getEnv = (key, defaultValue = '') => {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Environment variable ${key} is required`);
    }
    return value;
};

const getBool = (key, defaultValue = false) => {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
};

const config = {
    app: {
        port: parseInt(getEnv('PORT', 8000)),
        env: getEnv('NODE_ENV', 'development'),
        isProduction: getEnv('NODE_ENV') === 'production',
        clientUrl: getEnv('CLIENT_URL', 'http://localhost:3000'),
    },
    db: {
        host: getEnv('POSTGRES_HOST', '127.0.0.1'),
        port: parseInt(getEnv('POSTGRES_PORT', 5432)),
        name: getEnv('POSTGRES_DB', 'ninja_pdf_node'),
        user: getEnv('POSTGRES_USER', 'postgres'),
        password: getEnv('POSTGRES_PASSWORD', 'postgres'),
        ssl: getBool('POSTGRES_SSL', false),
    },
    auth: {
        jwtSecret: getEnv('JWT_SECRET'),
        jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '1h'),
        jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
        secure: getBool('JWT_COOKIE_SECURE', false),
        sameSite: getEnv('JWT_COOKIE_SAMESITE', 'Lax'),
        google: {
            clientId: getEnv('GOOGLE_CLIENT_ID', ''),
            clientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
            callbackUrl: getEnv('GOOGLE_CALLBACK_URL', ''),
        }
    },
    storage: {
        backend: getEnv('STORAGE_BACKEND', 'local'), // local, s3, r2
        uploadDir: getEnv('UPLOAD_DIR', 'uploads'),
        s3: {
            accessKey: getEnv('AWS_ACCESS_KEY_ID', ''),
            secretKey: getEnv('AWS_SECRET_ACCESS_KEY', ''),
            bucket: getEnv('AWS_STORAGE_BUCKET_NAME', ''),
            region: getEnv('AWS_S3_REGION_NAME', 'us-east-1'),
            endpoint: getEnv('AWS_S3_ENDPOINT_URL', ''),
            customDomain: getEnv('AWS_S3_CUSTOM_DOMAIN', ''),
        }
    },
    redis: {
        url: getEnv('REDIS_URL', 'redis://127.0.0.1:6379'),
    },
    email: {
        from: getEnv('DEFAULT_FROM_EMAIL', 'noreply@ninjapdf.com'),
        host: getEnv('EMAIL_HOST', 'smtp.gmail.com'),
        port: parseInt(getEnv('EMAIL_PORT', 587)),
        secure: getBool('EMAIL_USE_TLS', true),
        user: getEnv('EMAIL_HOST_USER', ''),
        pass: getEnv('EMAIL_HOST_PASSWORD', ''),
    },
    payment: {
        stripe: {
            publicKey: getEnv('STRIPE_PUBLIC_KEY', ''),
            secretKey: getEnv('STRIPE_SECRET_KEY', ''),
            webhookSecret: getEnv('STRIPE_WEBHOOK_SECRET', ''),
        },
        razorpay: {
            keyId: getEnv('RAZORPAY_KEY_ID', ''),
            keySecret: getEnv('RAZORPAY_KEY_SECRET', ''),
        }
    }
};

module.exports = config;
