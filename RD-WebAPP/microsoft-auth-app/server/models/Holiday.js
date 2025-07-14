const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: String, // Store as YYYY-MM-DD string for easy comparison
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: 'Company Holiday'
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
