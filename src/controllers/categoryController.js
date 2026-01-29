const Category = require('../models/Category.js');
const { getAuditLogModel } = require('../models/AuditLogModel');

// Helper function to create audit log
const createAuditLog = (action, recordId, userId, userRole, oldData, newData, req) => {
  setImmediate(async () => {
    try {
      const AuditLog = await getAuditLogModel();
      await AuditLog.create({
        action,
        module: 'CATEGORY',
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

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const category = new Category({ name, description, status });
    await category.save();

    // Create audit log
    await createAuditLog('CREATE', category._id, req.user?.id, req.user?.role, null, category.toObject(), req);

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
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

// Get all categories with room counts
exports.getCategoriesWithRooms = async (req, res) => {
  try {
    const Room = require('../models/Room');
    
    const [categories, rooms] = await Promise.all([
      Category.find().maxTimeMS(5000).lean().exec(),
      Room.find().maxTimeMS(5000).lean().exec()
    ]);
    
    // Add room counts to categories
    const categoriesWithCounts = categories.map(category => ({
      ...category,
      totalRooms: rooms.filter(room => {
        return room.categoryId === category._id || room.category?._id === category._id;
      }).length,
      availableRoomsCount: 0, // Will be updated after availability check
    }));
    
    res.json({
      categories: categoriesWithCounts,
      rooms: rooms
    });
  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      res.status(408).json({ error: 'Database query timeout. Please try again.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Get a category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    
    // Get original data for audit log
    const originalCategory = await Category.findById(req.params.id);
    if (!originalCategory) return res.status(404).json({ error: 'Category not found' });
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, status },
      { new: true, runValidators: true }
    );

    // Create audit log
    await createAuditLog('UPDATE', category._id, req.user?.id, req.user?.role, originalCategory.toObject(), category.toObject(), req);

    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // Create audit log
    await createAuditLog('DELETE', category._id, req.user?.id, req.user?.role, category.toObject(), null, req);

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};