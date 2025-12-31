const authService = require('../services/auth.service');

const register = async (req, res, next) => {
    try {
        const { user, token } = await authService.registerUser(req.body);
        res.status(201).json({
            status: 'success',
            data: { user, token }
        });
    } catch (error) {
        res.status(400).json({ status: 'fail', message: error.message });
    }
};

const login = async (req, res, next) => {
    try {
        // Pass the entire req object to service for IP/UserAgent extraction
        const result = await authService.loginUser(req);

        if (result.requires_2fa) {
            return res.status(200).json({
                status: 'success',
                data: {
                    detail: '2FA token required',
                    requires_2fa: true
                }
            });
        }

        const { user, token } = result;
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            path: '/'
        });

        res.json({
            status: 'success',
            data: { user, token }
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                status: 'fail',
                message: error.message,
                code: error.code
            });
        }
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        // req.user is set by auth middleware
        const { User } = require('../models');
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        res.json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getProfile
};
