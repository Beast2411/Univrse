const { failure } = require('../utils/apiResponse');

module.exports = (req, res) => failure(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
