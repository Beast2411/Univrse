const { createHash, randomBytes } = require('node:crypto');
const User = require('../models/User');
const AuthSession = require('../models/AuthSession');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { hashPassword, verifyPassword } = require('../utils/passwords');
const { SESSION_DAYS, readSessionCookie, setSessionCookie, clearSessionCookie } = require('../utils/sessionCookie');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function rateLimitAuth(req, res, next) {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
  const key = req.ip;
  const current = attempts.get(key);
  if (current && current.count >= MAX_ATTEMPTS && current.resetAt > now) {
    return res.status(429).json({ success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' });
  }
  attempts.set(key, current && current.resetAt > now
    ? { count: current.count + 1, resetAt: current.resetAt }
    : { count: 1, resetAt: now + WINDOW_MS });
  return next();
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email };
}

async function createSession(userId, res) {
  const token = randomBytes(32).toString('base64url');
  await AuthSession.create({
    user: userId,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + SESSION_MS)
  });
  setSessionCookie(res, token);
}

exports.register = [rateLimitAuth, asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (name.length < 2 || name.length > 100) {
    const error = new Error('Name must be between 2 and 100 characters.'); error.status = 400; throw error;
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    const error = new Error('Enter a valid email address.'); error.status = 400; throw error;
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    const error = new Error(`Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`); error.status = 400; throw error;
  }
  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = new Error('An account with this email already exists.'); duplicate.status = 409; throw duplicate;
    }
    throw error;
  }
  await createSession(user._id, res);
  return success(res, 201, 'Account created', { user: publicUser(user) });
})];

exports.login = [rateLimitAuth, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || email.length > 254 || typeof password !== 'string' || password.length > PASSWORD_MAX_LENGTH) {
    const error = new Error('Email or password is incorrect.'); error.status = 401; throw error;
  }
  const user = await User.findOne({ email }).select('+passwordHash');
  // Verify against a fixed dummy hash when the email is unknown to reduce account-enumeration timing differences.
  const dummyHash = `scrypt$16384$8$1$0123456789abcdef0123456789abcdef$${'0'.repeat(128)}`;
  const passwordMatches = await verifyPassword(password, user?.passwordHash || dummyHash);
  if (!user || !passwordMatches) {
    const error = new Error('Email or password is incorrect.'); error.status = 401; throw error;
  }
  user.lastLoginAt = new Date();
  await user.save();
  await createSession(user._id, res);
  return success(res, 200, 'Logged in', { user: publicUser(user) });
})];

exports.me = asyncHandler(async (req, res) => success(res, 200, 'Current user fetched', { user: publicUser(req.user) }));

exports.logout = asyncHandler(async (req, res) => {
  const token = readSessionCookie(req);
  if (token && token.length <= 200) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await AuthSession.deleteOne({ tokenHash });
  }
  clearSessionCookie(res);
  return success(res, 200, 'Logged out', null);
});
