const KitchenConsumption = require('../models/KitchenConsumption');
const KitchenStore = require('../models/KitchenStore');

// Create consumption record
const createConsumption = async (req, res) => {
  try {
    const { items, notes } = req.body;
    
    // Validate items availability in kitchen store
    for (const item of items) {
      const storeItem = await KitchenStore.findOne({ name: item.itemName });
      if (!storeItem) {
        return res.status(400).json({ 
          error: `Item "${item.itemName}" not found in kitchen store` 
        });
      }
      if (storeItem.quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient quantity for "${item.itemName}". Available: ${storeItem.quantity}` 
        });
      }
    }
    
    // Create consumption record
    const consumption = new KitchenConsumption({
      items,
      consumedBy: req.user.id,
      notes
    });
    
    await consumption.save();
    
    // Update kitchen store quantities
    for (const item of items) {
      await KitchenStore.findOneAndUpdate(
        { name: item.itemName },
        { $inc: { quantity: -item.quantity } }
      );
    }
    
    await consumption.populate('consumedBy', 'username');
    
    res.status(201).json({
      success: true,
      consumption
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all consumption records
const getAllConsumptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.consumptionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    } else if (startDate) {
      dateFilter.consumptionDate = {
        $gte: new Date(startDate),
        $lte: new Date(startDate + 'T23:59:59.999Z')
      };
    }
    
    const consumptions = await KitchenConsumption.find(dateFilter)
      .populate('consumedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
    const total = await KitchenConsumption.countDocuments(dateFilter);
    
    res.json({
      success: true,
      consumptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get consumption by ID
const getConsumptionById = async (req, res) => {
  try {
    const consumption = await KitchenConsumption.findById(req.params.id)
      .populate('consumedBy', 'username email');
      
    if (!consumption) {
      return res.status(404).json({ error: 'Consumption record not found' });
    }
    
    res.json({ success: true, consumption });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete consumption record
const deleteConsumption = async (req, res) => {
  try {
    const consumption = await KitchenConsumption.findByIdAndDelete(req.params.id);
    
    if (!consumption) {
      return res.status(404).json({ error: 'Consumption record not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Consumption record deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createConsumption,
  getAllConsumptions,
  getConsumptionById,
  deleteConsumption
};