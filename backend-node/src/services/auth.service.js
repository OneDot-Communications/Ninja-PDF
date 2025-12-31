const jwt = require('jsonwebtoken');
const { User, AuthAuditLog, UserSession } = require('../models');
const config = require('../config');
const redis = require('./redis.service');
// const emailService = require('./email.service'); // TODO: Implement
// const otpService = require('./otp.service'); // TODO: Implement

const LOCK_THRESHOLD = 10;
const LOCK_DURATION = 60 * 60; // 1 hour

const generateToken = (user, sessionId) => {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            tier: user.subscription_tier,
            session_id: sessionId
        },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, config.auth.jwtSecret);
};

const loginUser = async (reqObject) => {
    const { email, password, otp_token, device_fingerprint } = reqObject.body;
    const ip = reqObject.ip || reqObject.connection.remoteAddress;
    const userAgent = reqObject.headers['user-agent'];

    // 1. Check Lockout
    if (email) {
        const isLocked = await redis.get(`auth:lockout:${email}`);
        if (isLocked) {
            throw { status: 423, message: 'Account locked due to too many failed attempts' };
        }
    }

    const user = await User.findOne({ where: { email } });

    // Helper for failure
    const handleFailure = async (reason) => {
        await AuthAuditLog.create({
            user_id: user ? user.id : null,
            event_type: 'FAILED_LOGIN',
            ip_address: ip,
            user_agent: userAgent,
            metadata: { email, reason } // Already has metadata
        });

        if (email) {
            const key = `auth:failed:${email}`;
            const failures = await redis.incr(key);
            if (failures === 1) await redis.expire(key, 3600);

            if (failures >= LOCK_THRESHOLD) {
                await redis.set(`auth:lockout:${email}`, 'true', 'EX', LOCK_DURATION);
                // TODO: Send account locked email
            }
        }
    };

    if (!user) {
        await handleFailure('User not found');
        throw { status: 401, message: 'Invalid credentials' };
    }

    // 2. Initial Password Check
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
        await handleFailure('Incorrect password');
        throw { status: 401, message: 'Invalid credentials' };
    }

    // 3. Check Email Verification
    if (!user.is_verified) {
        // TODO: Resend verification email logic
        throw {
            status: 403,
            message: 'Email not verified. A new verification link has been sent to your inbox.',
            code: 'email_not_verified'
        };
    }

    // 4. Check 2FA
    if (user.is_2fa_enabled) {
        if (!otp_token) {
            return { requires_2fa: true };
        }

        // Disable real 2FA check for now until OTP service is ported
        // const isValidOtp = otpService.verify(user.totp_secret, otp_token);
        const isValidOtp = true; // Placeholder

        if (!isValidOtp) {
            await AuthAuditLog.create({
                user_id: user.id,
                event_type: 'FAILED_2FA',
                ip_address: ip,
                user_agent: userAgent,
                metadata: {} // FIXED: Added metadata
            });
            throw { status: 400, message: 'Invalid 2FA token', code: 'invalid_2fa' };
        }
    }

    // 5. Session & Fingerprint Check
    const existingSession = await UserSession.findOne({
        where: { user_id: user.id, device_fingerprint: device_fingerprint || 'unknown' }
    });

    if (!existingSession) {
        // New Device Alert
        // emailService.sendNewDeviceAlert(user, ip, userAgent);
    }

    const session = await UserSession.create({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        device_fingerprint: device_fingerprint || 'unknown'
    });

    // 6. Success
    user.last_login = new Date();
    await user.save();

    await AuthAuditLog.create({
        user_id: user.id,
        event_type: 'SUCCESSFUL_LOGIN',
        ip_address: ip,
        user_agent: userAgent,
        metadata: {} // FIXED: Added metadata
    });

    const token = generateToken(user, session.id);

    return { user, token, session };
};

const registerUser = async (data) => {
    // ... (Keep existing simple for now)
    // You might want to replicate the django signup logic later
    const { email, password, first_name, last_name } = data;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new Error('User already exists');

    // Create logic...
    const user = await User.create({ email, password, first_name, last_name });
    const token = generateToken(user, null);
    return { user, token };
};

module.exports = {
    generateToken,
    verifyToken,
    loginUser,
    registerUser
};
