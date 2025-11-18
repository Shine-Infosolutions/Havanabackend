const mongoose = require('mongoose');

const PurchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true
  },
  supplier: {
    name: { type: String, required: true },
    contact: String,
    phone: String,
    email: String
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'ordered', 'shipped', 'received', 'cancelled'],
    default: 'pending'
  },
  totalAmount: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  expectedDelivery: Date,
  actualDelivery: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, { timestamps: true });

// Auto-generate PO number
PurchaseOrderSchema.pre('save', async function(next) {
  if (!this.poNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating PO number:', error);
      this.poNumber = `PO-${new Date().getFullYear()}-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);