const RestaurantCategory = require('../models/RestaurantCategory.js');
const { getAuditLogModel } = require('../models/AuditLogModel');
const mongoose = require('mongoose');

// Helper function to create audit log (non-blocking)
const createAuditLog = (action, recordId, userId, userRole, oldData, newData, req) => {
  // Run asynchronously without blocking main operation
  setImmediate(async () => {
    try {
      const AuditLog = await getAuditLogModel();
      await AuditLog.create({
        action,
        module: 'RESTAURANT_CATEGORY',
        recordId,
        userId: userId || new mongoose.Types.ObjectId(),
        userRole: userRole || 'SYSTEM',
        oldData,
        newData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      });
      console.log(`✅ Audit log created: ${action} for restaurant category ${recordId}`);
    } catch (error) {
      console.error('❌ Audit log creation failed:', error);
    }
  });
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await RestaurantCategory.find()
      .sort({ createdAt: -1 })
      .maxTimeMS(5000)
      .lean()
      .exec();
    res.json(categories);
  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      res.status(408).json({ error: 'Database query timeout. Please try again.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Add new category
exports.addCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const category = new RestaurantCategory({ name, description, status });
    await category.save();
    
    // Create audit log
    createAuditLog('CREATE', category._id, req.user?.id, req.user?.role, null, category.toObject(), req);
    
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    
    // Get original data for audit log
    const originalCategory = await RestaurantCategory.findById(req.params.id);
    if (!originalCategory) return res.status(404).json({ error: 'Category not found' });
    
    const category = await RestaurantCategory.findByIdAndUpdate(
      req.params.id,
      { name, description, status },
      { new: true, runValidators: true }
    );
    
    // Create audit log
    createAuditLog('UPDATE', category._id, req.user?.id, req.user?.role, originalCategory.toObject(), category.toObject(), req);
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await RestaurantCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    // Store original data for audit log
    const originalData = category.toObject();
    
    await RestaurantCategory.findByIdAndDelete(req.params.id);
    
    // Create audit log
    createAuditLog('DELETE', req.params.id, req.user?.id, req.user?.role, originalData, null, req);
    
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};