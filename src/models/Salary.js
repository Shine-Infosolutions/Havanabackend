const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    required: true
  },
  
  // Allowances
  allowances: {
    hra: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // Overtime
  overtime: {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  
  // Deductions
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // Attendance based calculations
  attendanceData: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 }
  },
  
  // Calculated amounts
  grossSalary: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  
  // Payment details
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    default: 'pending'
  },
  paymentDate: { type: Date },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque'],
    default: 'bank_transfer'
  },
  
  // Additional info
  notes: { type: String },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

// Index for efficient queries
salarySchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

// Pre-save hook to calculate amounts
salarySchema.pre('save', function(next) {
  // Calculate total allowances
  const totalAllowances = Object.values(this.allowances).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate overtime amount
  this.overtime.amount = (this.overtime.hours || 0) * (this.overtime.rate || 0);
  
  // Calculate gross salary
  this.grossSalary = this.basicSalary + totalAllowances + this.overtime.amount;
  
  // Calculate total deductions
  this.totalDeductions = Object.values(this.deductions).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions;
  
  next();
});

module.exports = mongoose.model('Salary', salarySchema);