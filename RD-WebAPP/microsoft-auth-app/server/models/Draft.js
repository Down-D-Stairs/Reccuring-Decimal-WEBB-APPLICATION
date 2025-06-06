const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema({
  tripName: {
    type: String,
    required: true
  },
  // JUST ADD THIS ONE OPTIONAL FIELD
  projectName: {
    type: String,
    required: false  // Optional!
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
  totalAmount: {
    type: Number,
    default: 0
  },
  email: {
    type: String,
    required: true
  },
  expenses: [{
    amount: Number,
    date: Date,
    vendor: String,
    receipt: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Draft', draftSchema);
