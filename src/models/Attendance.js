const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => new Date().setHours(0, 0, 0, 0)
  },
  time_in: {
    type: Date
  },
  time_out: {
    type: Date
  },
  is_manual_checkout: {
    type: Boolean,
    default: false
  },
  total_hours: {
    type: Number,
    default: 0
  },
  shift: {
    type: String,
    enum: ['morning', 'evening'],
    default: 'morning'
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half Day', 'Late', 'Leave'],
    default: 'Present'
  },
  checkin_status: {
    type: String,
    enum: ['Present', 'Late', 'Half Day', 'Absent', 'Leave'],
    default: null
  },
  checkout_status: {
    type: String,
    enum: ['Present', 'Early', 'Late', null],
    default: null
  },
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'paid', 'unpaid', 'emergency'],
    default: null
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

// Calculate total hours only when both time_in and time_out exist
attendanceSchema.pre('save', function(next) {
  if (this.time_in && this.time_out) {
    const diffMs = this.time_out - this.time_in;
    this.total_hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  } else {
    this.total_hours = 0;
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
