const { failure } = require('../utils/apiResponse');

module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return failure(res, 400, 'Request body contains invalid JSON');
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return failure(res, 400, error.name === 'ValidationError' ? error.message : 'Invalid field value');
  }
  if (error.code === 11000) return failure(res, 400, 'A record with those unique values already exists');
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, error.message);
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (error.message || 'Internal server error');
  return failure(res, status, message);
};
