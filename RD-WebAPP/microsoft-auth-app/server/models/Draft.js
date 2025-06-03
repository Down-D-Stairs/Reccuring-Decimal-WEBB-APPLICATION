const mongoose = require('mongoose');

const draftExpenseSchema = new mongoose.Schema({
  vendor: String,
  amount: Number,
  date: String,
  comments: String,
  receipt: String
});

const draftSchema = new mongoose.Schema({
  tripName: {
    type: String,
    required: true
  },
  dateRange: {
    start: String,
    end: String
  },
  email: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  expenses: [draftExpenseSchema],
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
