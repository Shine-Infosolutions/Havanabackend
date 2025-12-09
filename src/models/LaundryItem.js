const mongoose = require('mongoose');

const laundryItemSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LaundryCategory",
  },

  itemName: { type: String, required: true },
  rate: { type: Number, required: true },
  unit: { type: String, enum: ["piece", "pair", "set"], default: "piece" },
  
  // Vendor-specific rates
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LaundryVendor"
  },
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Add index for better performance
laundryItemSchema.index({ categoryId: 1, isActive: 1 });

// Populate category details
laundryItemSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'categoryId',
    select: 'categoryName description isActive',
    match: { isActive: true }
  });
  next();
});

// Validate category
laundryItemSchema.pre('save', async function(next) {
  if (this.categoryId) {
    try {
      const categoryDoc = await mongoose.model('LaundryCategory').findById(this.categoryId);
      if (!categoryDoc || !categoryDoc.isActive) {
        return next(new Error('Invalid or inactive category'));
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const LaundryItem = mongoose.model('LaundryItem', laundryItemSchema);
module.exports = LaundryItem;