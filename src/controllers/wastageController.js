const Wastage = require("../models/Wastage");

// Create wastage record
exports.createWastage = async (req, res) => {
  try {
    const wastage = await Wastage.create(req.body);
    res.status(201).json({ success: true, data: wastage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all wastage records
exports.getAllWastage = async (req, res) => {
  try {
    const { department, category, date, shift } = req.query;
    const filter = {};
    
    if (department) filter.department = department;
    if (category) filter.category = category;
    if (shift) filter.shift = shift;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const wastage = await Wastage.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: wastage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get wastage by ID
exports.getWastageById = async (req, res) => {
  try {
    const wastage = await Wastage.findById(req.params.id);
    if (!wastage) {
      return res.status(404).json({ success: false, message: "Wastage record not found" });
    }
    res.json({ success: true, data: wastage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update wastage record
exports.updateWastage = async (req, res) => {
  try {
    const wastage = await Wastage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!wastage) {
      return res.status(404).json({ success: false, message: "Wastage record not found" });
    }
    res.json({ success: true, data: wastage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete wastage record
exports.deleteWastage = async (req, res) => {
  try {
    const wastage = await Wastage.findByIdAndDelete(req.params.id);
    if (!wastage) {
      return res.status(404).json({ success: false, message: "Wastage record not found" });
    }
    res.json({ success: true, message: "Wastage record deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get wastage statistics
exports.getWastageStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Wastage.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalWastage: { $sum: "$quantity" },
          totalCost: { $sum: "$estimatedCost" },
          totalRecords: { $sum: 1 },
          byDepartment: {
            $push: {
              department: "$department",
              cost: "$estimatedCost",
              quantity: "$quantity"
            }
          },
          byCategory: {
            $push: {
              category: "$category",
              cost: "$estimatedCost",
              quantity: "$quantity"
            }
          }
        }
      }
    ]);

    res.json({ success: true, data: stats[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};