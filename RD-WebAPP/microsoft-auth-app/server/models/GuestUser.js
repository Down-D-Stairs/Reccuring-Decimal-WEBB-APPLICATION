const mongoose = require('mongoose');

const guestUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  invitedBy: {
    type: String,
    required: true // Admin email who invited them
  },
  invitedDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isModerator: {
    type: Boolean,
    default: false // Can be promoted by admin later
  },
  lastLoginDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GuestUser', guestUserSchema);
