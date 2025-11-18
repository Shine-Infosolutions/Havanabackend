const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },

  totalSalary: { type: Number, required: true },   // Staff monthly salary
  workingDays: { type: Number, default: 0 },       // Total working days in that month
  paidDays: { type: Number, default: 0 },          // Present + Paid Leave + Half-day/2
  unpaidLeaves: { type: Number, default: 0 },      // Absent + Unpaid Leave
  
  deductions: { type: Number, default: 0 },        // Total deductions for the month
  netSalary: { type: Number, required: true },     // Salary after deductions

  details: [
    {
      date: Date,
      status: { 
        type: String, 
        enum: ['present', 'absent', 'half-day', 'leave'] 
      },
      leaveType: { 
        type: String, 
        enum: ['casual', 'sick', 'paid', 'unpaid'], 
        default: null 
      },
      deduction: { type: Number, default: 0 }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
