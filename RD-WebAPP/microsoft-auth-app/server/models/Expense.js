const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: Number,
  date: Date,
  vendor: String,
  receipt: {
    type: String,
    required: false
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  }
});

const tripSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  expenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }]
});

const Expense = mongoose.model('Expense', expenseSchema);
const Trip = mongoose.model('Trip', tripSchema);

module.exports = { Expense, Trip };
