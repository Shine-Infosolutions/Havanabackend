const mongoose = require('mongoose');

const laundryItemSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LaundryCategory",
  },
  categoryType: { type: String, enum: ["gentlemen", "ladies", "Hotel Laundry"], required: true },
  serviceType: { type: String, enum: ["dry_clean", "wash", "press"], required: true },
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
laundryItemSchema.index({ categoryType: 1 });

// Populate category details
laundryItemSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'categoryId',
    select: 'categoryName description isActive',
    match: { isActive: true }
  });
  next();
});

// Validate and sync category
laundryItemSchema.pre('save', async function(next) {
  if (this.categoryId) {
    try {
      const categoryDoc = await mongoose.model('LaundryCategory').findById(this.categoryId);
      if (!categoryDoc || !categoryDoc.isActive) {
        return next(new Error('Invalid or inactive category'));
      }
      
      // Auto-sync categoryType with category name
      if (this.isModified('categoryId')) {
        this.categoryType = categoryDoc.categoryName;
      }
      
      // Validate categoryType matches category name
      if (this.categoryType !== categoryDoc.categoryName) {
        return next(new Error('Category type must match the referenced category'));
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const LaundryItem = mongoose.model('LaundryItem', laundryItemSchema);
module.exports = LaundryItem;