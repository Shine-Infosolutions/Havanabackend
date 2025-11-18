const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff', 'restaurant'], required: true },
  restaurantRole: { type: String, enum: ['staff', 'cashier', 'chef'], required: false },
  department: {
    type: mongoose.Schema.Types.Mixed, // can be string or array
    required: false
  },
  
  // Staff Details (for admin registering staff)
  validId: { 
    type: String, 
    enum: ['aadhar', 'pan', 'passport', 'driving_license', 'voter_id']
  }, // ID proof type
  phoneNumber: { 
    type: String,
    required: function() {
      return this.role === 'staff';
    }
  },
  dateOfJoining: { type: Date },
  photo: { type: String }, // photo URL/path
  
  // Bank Details
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String
  },
  
  // Salary Details
  salaryDetails: {
    basicSalary: Number,
    allowances: Number,
    deductions: Number,
    netSalary: Number}
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
