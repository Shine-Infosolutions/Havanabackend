const NOC = require('../models/NOC');

// Create NOC (Simple checkbox approach)
const createAndApplyNOC = async (req, res) => {
  try {
    const { name, authorityType } = req.body;
    
    const noc = new NOC({
      name,
      authorityType,
      isCompletelyFree: true,
      status: 'active'
    });
    
    await noc.save();
    
    res.status(201).json({
      success: true,
      message: 'Non-chargeable service approved',
      noc
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all NOCs
const getAllNOCs = async (req, res) => {
  try {
    const nocs = await NOC.find().populate('authorizedBy', 'name');
    res.json({ success: true, nocs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get NOC by ID
const getNOCById = async (req, res) => {
  try {
    const { id } = req.params;
    const noc = await NOC.findById(id).populate('authorizedBy', 'name');
    
    if (!noc) {
      return res.status(404).json({ success: false, error: 'NOC not found' });
    }
    
    res.json({ success: true, noc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark NOC as used
const markNOCAsUsed = async (req, res) => {
  try {
    const { id } = req.params;
    const noc = await NOC.findByIdAndUpdate(id, { status: 'used' }, { new: true });
    
    if (!noc) {
      return res.status(404).json({ success: false, error: 'NOC not found' });
    }
    
    res.json({ success: true, message: 'NOC marked as used', noc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update NOC status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const noc = await NOC.findByIdAndUpdate(id, { status }, { new: true });
    
    if (!noc) {
      return res.status(404).json({ success: false, error: 'NOC not found' });
    }
    
    res.json({ success: true, message: `NOC status updated to ${status}`, noc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



// Update NOC
const updateNOC = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const noc = await NOC.findByIdAndUpdate(id, updates, { new: true }).populate('authorizedBy', 'name');
    if (!noc) {
      return res.status(404).json({ success: false, error: 'NOC not found' });
    }
    
    res.json({ success: true, noc });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete NOC
const deleteNOC = async (req, res) => {
  try {
    const { id } = req.params;
    await NOC.findByIdAndDelete(id);
    res.json({ success: true, message: 'NOC deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createAndApplyNOC,
  getAllNOCs,
  getNOCById,
  markNOCAsUsed,
  updateStatus,
  updateNOC,
  deleteNOC
};