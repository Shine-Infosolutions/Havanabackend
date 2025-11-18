const Salary = require('../models/Salary');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// Generate salary for a staff member
exports.generateSalary = async (req, res) => {
  try {
    const { 
      staffId, month, year, basicSalary, allowances, overtime, 
      deductions, notes, processedBy 
    } = req.body;

    if (!staffId || !month || !year || !basicSalary) {
      return res.status(400).json({ message: 'staffId, month, year, and basicSalary are required' });
    }

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check if salary already exists
    const existing = await Salary.findOne({ staffId, month, year });
    if (existing) {
      return res.status(400).json({ message: 'Salary already generated for this month' });
    }

    // Get attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const attendanceRecords = await Attendance.find({
      staffId,
      date: { $gte: startDate, $lte: endDate }
    });

    // Calculate total days in the month
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    
    const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'Late').length;
    const halfDays = attendanceRecords.filter(r => r.status === 'Half Day').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length;
    const leaveDays = attendanceRecords.filter(r => r.status === 'Leave').length;
    
    const attendanceData = {
      totalDays: totalDaysInMonth,
      presentDays,
      absentDays,
      halfDays,
      lateDays,
      leaveDays
    };

    // Calculate missing days (days without any attendance record)
    const recordedDays = attendanceRecords.length;
    const missingDays = totalDaysInMonth - recordedDays;
    
    // Calculate paid days (Present + Late + Half Days + Paid Leave)
    const paidLeaveDays = attendanceRecords.filter(r => 
      r.status === 'Leave' && ['paid', 'casual', 'sick'].includes(r.leaveType)
    ).length;
    
    const paidDays = presentDays + lateDays + (halfDays * 0.5) + paidLeaveDays;
    const unpaidDays = absentDays + missingDays + (leaveDays - paidLeaveDays);
    
    // Calculate salary based on paid days
    const perDaySalary = basicSalary / totalDaysInMonth;
    const adjustedBasicSalary = Math.round(perDaySalary * paidDays);
    
    // Calculate deductions
    const totalUnpaidDeduction = unpaidDays * perDaySalary;
    const lateDeduction = lateDays * (perDaySalary * 0.1); // 10% penalty for late
    
    const updatedDeductions = {
      ...deductions,
      absentDeduction: Math.round(totalUnpaidDeduction),
      lateDeduction: Math.round(lateDeduction)
    };
    
    // Update attendance data with calculated values
    attendanceData.missingDays = missingDays;
    attendanceData.paidDays = paidDays;
    attendanceData.unpaidDays = unpaidDays;

    const salary = new Salary({
      staffId,
      month,
      year,
      basicSalary: adjustedBasicSalary,
      allowances: allowances || {},
      overtime: overtime || {},
      deductions: updatedDeductions || {},
      attendanceData,
      notes,
      processedBy
    });

    await salary.save();
    await salary.populate('staffId', 'username email');
    
    res.json({ message: 'Salary generated successfully', salary });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update salary
exports.updateSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const updates = req.body;

    const salary = await Salary.findById(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        salary[key] = updates[key];
      }
    });

    await salary.save();
    await salary.populate('staffId', 'username email');
    
    res.json({ message: 'Salary updated successfully', salary });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark salary as paid
exports.markSalaryPaid = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const { paymentMethod, paymentDate, notes } = req.body;

    const salary = await Salary.findById(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    salary.paymentStatus = 'paid';
    salary.paymentDate = paymentDate || new Date();
    salary.paymentMethod = paymentMethod || 'bank_transfer';
    if (notes) salary.notes = notes;

    await salary.save();
    res.json({ message: 'Salary marked as paid', salary });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get salary records
exports.getSalaries = async (req, res) => {
  try {
    const { staffId, month, year, status } = req.query;
    let filter = {};

    if (staffId) filter.staffId = staffId;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.paymentStatus = status;

    const salaries = await Salary.find(filter)
      .populate('staffId', 'username email role')
      .populate('processedBy', 'username')
      .sort({ year: -1, month: -1 });

    res.json(salaries);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get salary slip
exports.getSalarySlip = async (req, res) => {
  try {
    const { salaryId } = req.params;

    const salary = await Salary.findById(salaryId)
      .populate('staffId', 'username email phoneNumber bankDetails')
      .populate('processedBy', 'username');

    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    res.json(salary);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Auto-calculate deductions based on attendance
exports.calculateDeductions = async (req, res) => {
  try {
    const { staffId, month, year, perDayAmount } = req.body;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const attendanceRecords = await Attendance.find({
      staffId,
      date: { $gte: startDate, $lte: endDate }
    });

    const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length;
    const halfDays = attendanceRecords.filter(r => r.status === 'Half Day').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'Late').length;

    const deductions = {
      absentDeduction: absentDays * perDayAmount,
      lateDeduction: lateDays * (perDayAmount * 0.1), // 10% of per day amount for late
      halfDayDeduction: halfDays * (perDayAmount * 0.5) // 50% deduction for half day
    };

    res.json({ 
      attendanceData: {
        absentDays,
        halfDays,
        lateDays
      },
      suggestedDeductions: deductions 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get staff salary history
exports.getStaffSalaryHistory = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { limit = 12 } = req.query;

    const salaries = await Salary.find({ staffId })
      .sort({ year: -1, month: -1 })
      .limit(parseInt(limit))
      .populate('processedBy', 'username');

    res.json(salaries);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};