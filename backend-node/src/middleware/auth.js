const jwt = require('jsonwebtoken');
const config = require('../config');

const protect = (req, res, next) => {
    let token;

    console.log('Auth Debug - Cookies:', req.cookies);
    console.log('Auth Debug - Headers:', req.headers.authorization);


    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ status: 'fail', message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, config.auth.jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        // console.error('Token verification failed:', error.message);
        res.status(401).json({ status: 'fail', message: 'Not authorized, token failed' });
    }
};

module.exports = { protect };
