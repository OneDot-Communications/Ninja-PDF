const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Verify a password against a Django or Bcrypt hash
 * @param {string} password - The plain text password
 * @param {string} hash - The stored hash from DB
 * @returns {boolean}
 */
const verifyPassword = (password, hash) => {
    if (!hash) return false;

    // Handle Django PBKDF2 format
    if (hash.startsWith('pbkdf2_sha256$')) {
        const parts = hash.split('$');
        if (parts.length !== 4) return false;

        const iterations = parseInt(parts[1]);
        const salt = parts[2];
        const originalHash = parts[3];

        const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
        const newHash = derivedKey.toString('base64');

        return newHash === originalHash;
    }

    // Handle Django Argon2 format (if used)
    if (hash.startsWith('argon2')) {
        // You'd need argon2 package for this, but standard Django is usually PBKDF2
        // If you encounter this, we'll need to install 'argon2'
        console.warn('Argon2 password hash detected but not supported yet.');
        return false;
    }

    // Handle standard Bcrypt
    if (hash.startsWith('$2') || hash.startsWith('$2a') || hash.startsWith('$2b')) {
        return bcrypt.compareSync(password, hash);
    }

    // Fallback (or plain text if you were insecure, which we assume not)
    return false;
};

/**
 * Hash a password using Bcrypt (New users will use this)
 * @param {string} password 
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

module.exports = {
    verifyPassword,
    hashPassword
};
