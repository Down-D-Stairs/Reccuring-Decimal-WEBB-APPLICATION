const mongoose = require('mongoose');

// Schema for individual day entries within a time entry
const dayEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  hours: {
    type: Number,
    default: 0,
    min: 0,
    max: 24
  },
  notes: String
});

// Schema for weekly time entries
const timeEntrySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  employeeName: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  isBillable: {
    type: Boolean,
    default: true
  },
  // Array of day entries (Monday to Sunday)
  dayEntries: [dayEntrySchema],
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },
  submittedDate: Date,
  approvedDate: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  comments: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Schema for projects
const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true
  },
  clientName: { // Split Project and Client Sepperately, another const variable
    type: String,
    required: true
  },
  projectType: {
    type: String,
    required: true
  },
  poNumber: String, 
  contractNumber: String,
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
  maxHours: {
    type: Number,
    required: true
  },
  maxBudget: {
    type: Number,
    required: true
  },
  approvers: {
    type: String,  // Email addresses or names
    required: true
  },
  projectMembers: { // Tie Project ID with Employee instead of this
    type: String,  // Email addresses or names
    required: true
  },
  
  location: String,
  isHybrid: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemProject: {
    type: Boolean,
    default: false
  }, // For PTO, Holiday, etc.
  projectTotalHours: {
    type: Number,
    default: 0
  },
  projectTotalBilledHours: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to calculate total hours
timeEntrySchema.pre('save', function(next) {
  this.totalHours = this.dayEntries.reduce((sum, day) => sum + day.hours, 0);
  this.updatedAt = Date.now();
  next();
});

// Pre-save hook to update project dates
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);
const Project = mongoose.model('Project', projectSchema);
const DayEntry = mongoose.model('DayEntry', dayEntrySchema);

module.exports = { TimeEntry, Project, DayEntry };
