const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },

  timeUsed: {
    type: Number,
    default: 0, // number of times used
  },

  allowedUses: {
    type: Number,
    default: 1, // maximum number of uses allowed
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },

  validTill: {
    type: Date,
    required: true
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: expired = true if current date > validTill
couponSchema.virtual('expired').get(function () {
  return new Date() > this.validTill;
});

module.exports = mongoose.model('Coupon', couponSchema);
