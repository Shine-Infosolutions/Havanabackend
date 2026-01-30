const KOT = require('../models/KOT');
const { createAuditLog } = require('../utils/auditLogger');

// Create new KOT
exports.createKOT = async (req, res) => {
  try {
    const kot = new KOT(req.body);
    await kot.save();
    
    // Create audit log
    createAuditLog('CREATE', 'KOT', kot._id, req.user?.id, req.user?.role, null, kot.toObject(), req);
    
    res.status(201).json(kot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all KOTs
exports.getAllKOTs = async (req, res) => {
  try {
    const kots = await KOT.find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    res.json(kots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update KOT status
exports.updateKOTStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Get original data for audit log
    const originalKOT = await KOT.findById(id);
    if (!originalKOT) {
      return res.status(404).json({ error: 'KOT not found' });
    }
    
    const kot = await KOT.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    // Create audit log
    createAuditLog('UPDATE', 'KOT', kot._id, req.user?.id, req.user?.role, originalKOT.toObject(), kot.toObject(), req);
    
    res.json(kot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update KOT item statuses
exports.updateItemStatuses = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemStatuses } = req.body;
    
    // Get original data for audit log
    const originalKOT = await KOT.findById(id);
    if (!originalKOT) {
      return res.status(404).json({ error: 'KOT not found' });
    }
    
    const kot = await KOT.findByIdAndUpdate(
      id,
      { $push: { itemStatuses: { $each: itemStatuses } } },
      { new: true }
    );
    
    // Create audit log
    createAuditLog('UPDATE', 'KOT', kot._id, req.user?.id, req.user?.role, originalKOT.toObject(), kot.toObject(), req);
    
    res.json(kot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};