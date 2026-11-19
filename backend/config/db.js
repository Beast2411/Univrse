const mongoose = require("mongoose");

async function connectDatabase(uri) {
    if (!uri || uri === "your_mongodb_connection_string") return false;
    await mongoose.connect(uri, {serverSelectionTimeoutMS: 5000});
    return true;
}

module.exports = {connectDatabase};
const dns = require('node:dns');
const mongoose = require('mongoose');

async function connectDatabase() {
  const dnsServers = (process.env.DNS_SERVERS || '').split(',').map((server) => server.trim()).filter(Boolean);
  if (dnsServers.length) dns.setServers(dnsServers);
  const uri = process.env.MONGO_URI;
  if (!uri || uri === 'your_mongodb_connection_string') {
    throw new Error('MONGO_URI is missing. Set it in backend/.env before starting the API.');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

module.exports = connectDatabase;
