const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Utility: returns start/end of day in UTC
const getDayRange = (date) => {
  let d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  let next = new Date(d);
  next.setUTCDate(next.getUTCDate() + 1);
  return {start: d, end: next};
};

/**
 * Clock in - Mark attendance start
 */
exports.clockIn = async (req, res) => {
  try {
    const { staffId, notes, shift } = req.body;
    console.log('Clock-in request body:', req.body); // Debug log
    if (!staffId) return res.status(400).json({ message: 'staffId is required' });
    if (!shift) return res.status(400).json({ message: 'shift is required' });

    const staff = await User.findById(staffId);
    if (!staff)
      return res.status(404).json({ message: 'Staff not found/invalid' });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const existing = await Attendance.findOne({ staffId, date: today });
    
    if (existing) {
      return res.status(400).json({ message: 'Already clocked in today' });
    }

    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const checkInHour = istTime.getHours();
    const checkInMinute = istTime.getMinutes();
    
    console.log(`Check-in time (IST): ${checkInHour}:${checkInMinute}, Shift: ${shift}`); // Debug
    
    // Use the shift selected by staff in UI
    const actualShift = shift;
    
    // Shift-based timing rules based on UI selection
    let status = 'Present';
    if (shift === 'morning') {
      // Morning shift: 10 AM - 4 PM (6 hours)
      if (checkInHour > 10 || (checkInHour === 10 && checkInMinute > 0)) {
        status = 'Late';
      }
      console.log(`Morning shift logic: ${checkInHour}:${checkInMinute} -> ${status}`);
    } else if (shift === 'evening') {
      // Evening shift: 4:00 PM - 10 PM
      // Present if check-in at or before 4:00 PM, Late if after 4:00 PM
      if (checkInHour > 16 || (checkInHour === 16 && checkInMinute > 0)) {
        status = 'Late'; // Check-in after 4:00 PM is late
      } else {
        status = 'Present'; // Check-in at or before 4:00 PM is on time
      }
      console.log(`Evening shift logic: ${checkInHour}:${checkInMinute} -> ${status}`);
    }
    
    const attendance = new Attendance({
      staffId,
      date: today,
      time_in: now,
      shift: shift,
      status: status,
      checkin_status: status,
      notes
    });

    await attendance.save();
    res.json({ message: 'Clocked in successfully', attendance });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Clock out - Mark attendance end
 */
exports.clockOut = async (req, res) => {
  try {
    const { staffId, is_manual_checkout = false, notes } = req.body;
    if (!staffId) return res.status(400).json({ message: 'staffId is required' });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ staffId, date: today });
    
    if (!attendance) {
      return res.status(404).json({ message: 'No clock-in record found for today' });
    }

    if (attendance.time_out) {
      return res.status(400).json({ message: 'Already clocked out today' });
    }

    const checkOutTime = new Date();
    attendance.time_out = checkOutTime;
    attendance.is_manual_checkout = is_manual_checkout;
    if (notes) attendance.notes = notes;

    // Calculate total hours worked
    const hoursWorked = (attendance.time_out - attendance.time_in) / (1000 * 60 * 60);
    attendance.total_hours = hoursWorked;
    
    // Convert to IST for checkout time comparison
    const istCheckOutTime = new Date(checkOutTime.getTime() + (5.5 * 60 * 60 * 1000));
    const checkOutHour = istCheckOutTime.getHours();
    const checkOutMinute = istCheckOutTime.getMinutes();
    
    // Determine checkout status based on shift timing - permanently store
    const attendanceShift = attendance.shift || 'morning';
    let checkoutStatus = 'Present';
    
    if (attendanceShift === 'morning') {
      // Morning shift: 10 AM - 4 PM
      if (checkOutHour < 16) {
        checkoutStatus = 'Early';
      } else if (checkOutHour > 16) {
        checkoutStatus = 'Late';
      }
    } else {
      // Evening shift: 4 PM - 10 PM
      if (checkOutHour < 22) {
        checkoutStatus = 'Early';
      } else if (checkOutHour > 22) {
        checkoutStatus = 'Late';
      }
    }
    
    // Permanently store checkout status
    attendance.checkout_status = checkoutStatus;
    
    // Calculate overall final status based on conditions
    if (hoursWorked < 3) {
      attendance.status = 'Half Day';
    } else if (attendance.checkin_status === 'Late') {
      attendance.status = 'Late';
    } else {
      attendance.status = 'Present';
    }
    
    // Ensure shift is set for old records
    if (!attendance.shift) {
      attendance.shift = attendanceShift;
    }

    await attendance.save();
    res.json({ message: 'Clocked out successfully', attendance });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Checkout with specific status
 */
exports.checkoutWithStatus = async (req, res) => {
  try {
    const { staffId, checkout_status, notes } = req.body;
    if (!staffId) return res.status(400).json({ message: 'staffId is required' });
    if (!checkout_status) return res.status(400).json({ message: 'checkout_status is required' });

    const validCheckoutStatus = ['Present', 'Early', 'Late'];
    if (!validCheckoutStatus.includes(checkout_status)) {
      return res.status(400).json({ message: `Invalid checkout_status. Allowed: ${validCheckoutStatus.join(', ')}` });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ staffId, date: today });
    
    if (!attendance) {
      return res.status(404).json({ message: 'No clock-in record found for today' });
    }

    if (attendance.time_out) {
      return res.status(400).json({ message: 'Already clocked out today' });
    }

    attendance.time_out = new Date();
    attendance.checkout_status = checkout_status;
    if (notes) attendance.notes = notes;

    await attendance.save();
    res.json({ message: 'Checked out successfully', attendance });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Mark attendance manually (for admin)
 */
exports.markAttendance = async (req, res) => {
  try {
    const { staffId, date, status, time_in, time_out, notes, leaveType } = req.body;
    if (!staffId) return res.status(400).json({ message: 'staffId is required' });

    const staff = await User.findById(staffId);
    if (!staff)
      return res.status(404).json({ message: 'Staff not found/invalid' });

    const validStatus = ['Present', 'Absent', 'Half Day', 'Late', 'Leave'];
    if (status && !validStatus.includes(status))
      return res.status(400).json({ message: `Invalid status. Allowed: ${validStatus.join(', ')}` });

    const validLeaveTypes = ['casual', 'sick', 'paid', 'unpaid', 'emergency'];
    if (status === 'Leave') {
      if (!leaveType || !validLeaveTypes.includes(leaveType))
        return res.status(400).json({ message: `Leave type required. Allowed: ${validLeaveTypes.join(', ')}` });
      // For leave, time_in is not required
    } else if (!time_in) {
      return res.status(400).json({ message: 'time_in is required for non-leave attendance' });
    }

    const attendanceDate = new Date(date || new Date());
    attendanceDate.setUTCHours(0, 0, 0, 0);
    
    const attendance = new Attendance({
      staffId,
      date: attendanceDate,
      time_in: status === 'Leave' ? undefined : new Date(time_in),
      time_out: time_out ? new Date(time_out) : undefined,
      status: status || 'Present',
      checkin_status: status || 'Present',
      leaveType: status === 'Leave' ? leaveType : null,
      notes
    });

    await attendance.save();
    res.json({ message: 'Attendance marked successfully', attendance });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET attendance by staffId or date range
 */
exports.getAttendance = async (req, res) => {
  try {
    const { staffId, date, startDate, endDate } = req.query;
    let filter = {};
    
    if (staffId) {
      const staff = await User.findById(staffId);
      if (!staff) return res.status(404).json({ message: 'Staff not found' });
      filter.staffId = staff._id;
    }
    
    if (date) {
      let {start, end} = getDayRange(date);
      filter.date = { $gte: start, $lt: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    
    const records = await Attendance.find(filter)
      .populate('staffId', 'username email role')
      .sort({ date: -1 });
    
    res.json(records);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET all attendance with pagination
 */
exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const records = await Attendance.find()
      .populate('staffId', 'username email role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Attendance.countDocuments();
    
    res.json({
      records,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: records.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update attendance record
exports.updateAttendance = async (req, res) => {
  try {
    const { attendanceId, status, checkin_status, checkout_status, time_in, time_out, notes, is_manual_checkout, leaveType } = req.body;

    if (!attendanceId) return res.status(400).json({ message: 'attendanceId is required' });

    const validStatus = ['Present', 'Absent', 'Half Day', 'Late', 'Leave'];
    const validCheckoutStatus = ['Present', 'Early', 'Late', null];
    
    if (status && !validStatus.includes(status))
      return res.status(400).json({ message: `Invalid status. Allowed: ${validStatus.join(', ')}` });
    if (checkin_status && !validStatus.includes(checkin_status))
      return res.status(400).json({ message: `Invalid checkin_status. Allowed: ${validStatus.join(', ')}` });
    if (checkout_status !== undefined && !validCheckoutStatus.includes(checkout_status))
      return res.status(400).json({ message: `Invalid checkout_status. Allowed: ${validCheckoutStatus.join(', ')}` });

    const validLeaveTypes = ['casual', 'sick', 'paid', 'unpaid', 'emergency'];
    if ((status === 'Leave' || checkin_status === 'Leave') && (!leaveType || !validLeaveTypes.includes(leaveType)))
      return res.status(400).json({ message: `Leave type required. Allowed: ${validLeaveTypes.join(', ')}` });

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    if (status) {
      attendance.status = status;
      attendance.checkin_status = status;
      attendance.leaveType = status === 'Leave' ? leaveType : null;
    }
    if (checkin_status) {
      attendance.checkin_status = checkin_status;
      attendance.status = checkin_status;
      attendance.leaveType = checkin_status === 'Leave' ? leaveType : null;
    }
    if (checkout_status !== undefined) attendance.checkout_status = checkout_status;
    if (time_in) attendance.time_in = new Date(time_in);
    if (time_out) attendance.time_out = new Date(time_out);
    if (notes !== undefined) attendance.notes = notes;
    if (is_manual_checkout !== undefined) attendance.is_manual_checkout = is_manual_checkout;

    await attendance.save();
    res.json({ message: 'Attendance updated successfully', attendance });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get today's attendance for a staff member
exports.getTodayAttendance = async (req, res) => {
  try {
    const { staffId } = req.params;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({ staffId, date: today })
      .populate('staffId', 'username email role');
    
    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Staff Dashboard - Get attendance status and summary
exports.getStaffDashboard = async (req, res) => {
  try {
    const { staffId } = req.params;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    // Today's attendance
    const todayAttendance = await Attendance.findOne({ staffId, date: today });

    // Monthly summary
    const monthlyRecords = await Attendance.find({
      staffId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const summary = {
      totalDays: monthlyRecords.length,
      present: monthlyRecords.filter(r => r.status === 'Present').length,
      late: monthlyRecords.filter(r => r.status === 'Late').length,
      halfDay: monthlyRecords.filter(r => r.status === 'Half Day').length,
      absent: monthlyRecords.filter(r => r.status === 'Absent').length,
      leave: monthlyRecords.filter(r => r.status === 'Leave').length,
      totalHours: monthlyRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0)
    };

    // Recent 7 days attendance
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentAttendance = await Attendance.find({
      staffId,
      date: { $gte: last7Days }
    }).sort({ date: -1 }).limit(7);

    res.json({
      todayStatus: todayAttendance,
      monthlySummary: summary,
      recentAttendance,
      canClockIn: !todayAttendance,
      canClockOut: todayAttendance && !todayAttendance.time_out
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get staff monthly attendance report
exports.getMonthlyReport = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query;
    
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const records = await Attendance.find({
      staffId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: 1 });

    // Calculate total days in the month
    const totalDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    const summary = {
      month: targetMonth + 1,
      year: targetYear,
      totalDays: totalDaysInMonth,
      present: records.filter(r => r.status === 'Present').length,
      late: records.filter(r => r.status === 'Late').length,
      halfDay: records.filter(r => r.status === 'Half Day').length,
      absent: records.filter(r => r.status === 'Absent').length,
      leave: records.filter(r => r.status === 'Leave').length,
      totalHours: records.reduce((sum, r) => sum + (r.total_hours || 0), 0),
      averageHours: records.length > 0 ? (records.reduce((sum, r) => sum + (r.total_hours || 0), 0) / records.length).toFixed(2) : 0
    };

    res.json({
      summary,
      records
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
