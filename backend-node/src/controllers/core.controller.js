const getPublicSettings = (req, res) => {
    // Return mock public settings for now, matching expected Django output structure
    res.json({
        status: 'success',
        data: {
            site_name: 'Ninja PDF',
            maintenance_mode: false,
            allow_registrations: true,
            version: '1.0.0',
            features: {
                ocr: true,
                compression: true,
                conversion: true
            }
        }
    });
};

module.exports = {
    getPublicSettings
};
