require('dotenv').config();
const mongoose = require('mongoose');

const timeTableConnection = mongoose.createConnection(process.env.MONGODB_URI_TIMETABLE);

module.exports = { timeTableConnection };
