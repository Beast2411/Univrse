const mongoose = require("mongoose");

async function connectDatabase(uri) {
    if (!uri || uri === "your_mongodb_connection_string") return false;
    await mongoose.connect(uri, {serverSelectionTimeoutMS: 5000});
    return true;
}

module.exports = {connectDatabase};