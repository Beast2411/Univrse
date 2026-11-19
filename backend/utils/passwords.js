const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: COST, r: BLOCK_SIZE, p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024
  });
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, cost, blockSize, parallelization, saltHex, keyHex] = String(stored).split('$');
  if (algorithm !== 'scrypt' || !/^\d+$/.test(cost) || !/^\d+$/.test(blockSize)
    || !/^\d+$/.test(parallelization) || !/^[a-f\d]{32}$/i.test(saltHex || '')
    || !/^[a-f\d]{128}$/i.test(keyHex || '')) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(cost), r: Number(blockSize), p: Number(parallelization),
    maxmem: 64 * 1024 * 1024
  });
  return timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
