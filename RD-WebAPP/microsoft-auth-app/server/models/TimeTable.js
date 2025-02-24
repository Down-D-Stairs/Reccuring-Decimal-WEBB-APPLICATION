// server/models/TimeTable.js
const mongoose = require('mongoose');

const employeeTimeSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: true
  },
  dateRange: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  totalHours: {
    type: Number,
    required: true
  }
});

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  totalHours: {
    type: Number,
    default: 0
  },
  employeeTimes: [employeeTimeSchema]
});

const Project = mongoose.model('Project', projectSchema);
module.exports = { Project };
