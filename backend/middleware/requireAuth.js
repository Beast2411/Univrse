const { createHash } = require('node:crypto');
const AuthSession = require('../models/AuthSession');
const User = require('../models/User');
const { readSessionCookie } = require('../utils/sessionCookie');

module.exports = async function requireAuth(req, res, next) {
  try {
    const token = readSessionCookie(req);
    if (!token || token.length > 200) return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await AuthSession.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).select('+tokenHash').lean();
    if (!session) return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
    const user = await User.findById(session.user).select('name email lastLoginAt createdAt').lean();
    if (!user) {
      await AuthSession.deleteOne({ _id: session._id });
      return res.status(401).json({ success: false, message: 'This account is no longer available. Please log in again.' });
    }
    req.user = user;
    req.authSessionId = session._id;
    req.authTokenHash = tokenHash;
    return next();
  } catch (error) {
    return next(error);
  }
};
