const mongoose = require('mongoose');

const moderatorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  addedBy: {
    type: String,
    required: true
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Moderator', moderatorSchema);
