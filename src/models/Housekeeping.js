const mongoose = require('mongoose');

const housekeepingSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'cleaning', 'completed', 'verified'],
    default: 'pending'
  },
  cleaningType: {
    type: String,
    enum: ['daily', 'deep-clean', 'checkout', 'special-request'],
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  startTime: Date,
  endTime: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  images: {
    before: [{
      url: String,
      uploadedAt: Date
    }],
    after: [{
      url: String,
      uploadedAt: Date
    }]
  },
  issues: [{
    description: String,
    resolved: {
      type: Boolean,
      default: false
    }
  }]
}, { timestamps: true });

module.exports = mongoose.models.Housekeeping || mongoose.model('Housekeeping', housekeepingSchema);