const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const User = require('../models/User');

exports.generatePayroll = async (req, res) => {
  try {
    const { staffId, month, year } = req.body;

    if (!staffId) return res.status(400).json({ message: 'staffId is required' });
    if (!month || month < 1 || month > 12) return res.status(400).json({ message: 'Invalid month' });
    if (!year || year < 2000) return res.status(400).json({ message: 'Invalid year' });

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') return res.status(404).json({ message: 'Staff not found' });

    const monthlySalary = staff.salaryDetails?.basicSalary || 0;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const attendanceRecords = await Attendance.find({
      staffId,
      date: { $gte: startDate, $lt: endDate }
    });

    // Map attendance by day
    const attMap = {};
    attendanceRecords.forEach(att => {
      attMap[att.date.toDateString()] = att;
    });

    const daysInMonth = new Date(year, month, 0).getDate();

    // Fixed configuration based on requirement
    const totalDaysInMonth = 30;    // Salary always divided by 30 days
    const totalSundays = 4;         // 4 Sundays always paid and excluded from workingDays
    const workingDays = totalDaysInMonth - totalSundays; // 26

    let paidDays = 0;
    let unpaidLeaves = 0;
    let totalDeduction = 0;
    const details = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(year, month - 1, d);
      const dayStr = currentDate.toDateString();

      if (currentDate.getDay() === 0) {
        details.push({ date: currentDate, status: 'present', leaveType: null, deduction: 0 });
        paidDays++;
        continue;
     }     

      // For non-Sundays
      let att = attMap[dayStr];
      let status = 'absent';
      let leaveType = null;
      let deduction = 0;

      if (att) {
        status = att.status;
        leaveType = att.leaveType || null;
      }

      if (status === 'absent') {
        deduction = monthlySalary / totalDaysInMonth;
        unpaidLeaves++;
      } else if (status === 'half-day') {
        deduction = (monthlySalary / totalDaysInMonth) / 2;
        paidDays += 0.5;
      } else if (status === 'leave') {
        if (leaveType === 'unpaid') {
          deduction = monthlySalary / totalDaysInMonth;
          unpaidLeaves++;
        } else {
          // paid leave types: casual, sick, paid => no deduction
          paidDays++;
        }
      } else {
        // present full day
        paidDays++;
      }

      totalDeduction += deduction;
      details.push({ date: currentDate, status, leaveType, deduction });
    }

    const netSalary = monthlySalary - totalDeduction;

    let payroll = await Payroll.findOne({ staffId, month, year });
    if (payroll) {
      payroll.totalSalary = monthlySalary;
      payroll.workingDays = workingDays;
      payroll.paidDays = paidDays;
      payroll.unpaidLeaves = unpaidLeaves;
      payroll.deductions = totalDeduction;
      payroll.netSalary = netSalary;
      payroll.details = details;
      await payroll.save();
    } else {
      payroll = new Payroll({
        staffId,
        month,
        year,
        totalSalary: monthlySalary,
        workingDays,
        paidDays,
        unpaidLeaves,
        deductions: totalDeduction,
        netSalary,
        details
      });
      await payroll.save();
    }

    res.json({ message: 'Payroll generated', payroll });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
