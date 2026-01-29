const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { getAuditLogModel } = require('../models/AuditLogModel');

// Helper function to create audit log
const createAuditLog = (action, recordId, userId, userRole, oldData, newData, req) => {
  setImmediate(async () => {
    try {
      const AuditLog = await getAuditLogModel();
      await AuditLog.create({
        action,
        module: 'USER',
        recordId,
        userId: userId || 'SYSTEM',
        userRole: userRole || 'SYSTEM',
        oldData,
        newData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      });
    } catch (error) {
      console.error('❌ Audit log creation failed:', error);
    }
  });
};

// Add new user
exports.addUser = async (req, res) => {
  try {
    const { username, email, phoneNumber, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user (password will be hashed by pre-save middleware)
    const user = new User({
      username,
      email,
      phoneNumber,
      password,
      role
    });

    await user.save();

    // Create audit log
    await createAuditLog('CREATE', user._id, req.user?.id, req.user?.role, null, user.toObject(), req);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User added successfully',
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Get original data for audit log
    const originalUser = await User.findById(userId);
    if (!originalUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash password if provided
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    // Create audit log
    await createAuditLog('UPDATE', user._id, req.user?.id, req.user?.role, originalUser.toObject(), user.toObject(), req);

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get original data for audit log
    const originalUser = await User.findById(userId);
    if (!originalUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'inactive' },
      { new: true }
    ).select('-password');

    // Create audit log
    await createAuditLog('DELETE', user._id, req.user?.id, req.user?.role, originalUser.toObject(), user.toObject(), req);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle user status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const originalData = user.toObject();
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status: newStatus },
      { new: true }
    ).select('-password');

    // Create audit log
    await createAuditLog('UPDATE', updatedUser._id, req.user?.id, req.user?.role, originalData, updatedUser.toObject(), req);

    res.json({
      success: true,
      message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};