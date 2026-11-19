const mongoose = require('mongoose');

function requireObjectId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    const error = new Error('Invalid resource id');
    error.status = 400;
    throw error;
  }
}

function pick(source, fields) {
  const result = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source || {}, field)) result[field] = source[field];
  }
  return result;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    const error = new Error(`Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function validateEnum(value, allowed, name) {
  if (!allowed.includes(value)) {
    const error = new Error(`${name} must be one of: ${allowed.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

module.exports = { requireObjectId, pick, requireFields, validateEnum };
