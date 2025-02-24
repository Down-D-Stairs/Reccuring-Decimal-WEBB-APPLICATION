const mongoose = require('mongoose');
const { timeTableConnection } = require('../server');

const timeEntrySchema = new mongoose.Schema({
  employeeName: String,
  dateRange: {
    start: Date,
    end: Date
  },
  employeeHours: Number,
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }
});

const projectSchema = new mongoose.Schema({
  projectName: String,
  clientName: String,
  projectTotalHours: {
    type: Number,
    default: 0
  },
  employeeTimes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeEntry'
  }]
});

const TimeEntry = timeTableConnection.model('TimeEntry', timeEntrySchema);
const Project = timeTableConnection.model('Project', projectSchema);

module.exports = { TimeEntry, Project };
