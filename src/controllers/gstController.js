const GST = require('../models/GST');
const axios = require('axios');

// Create GST Rate
const createGST = async (req, res) => {
  try {
    const { totalGST, cgst, sgst } = req.body;
    
    const gst = new GST({
      totalGST,
      cgst,
      sgst
    });
    
    await gst.save();
    res.status(201).json({ success: true, gst });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all GSTs
const getAllGSTs = async (req, res) => {
  try {
    const gsts = await GST.find();
    res.json({ success: true, gsts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get GST by ID
const getGSTById = async (req, res) => {
  try {
    const { id } = req.params;
    const gst = await GST.findById(id);
    
    if (!gst) {
      return res.status(404).json({ success: false, error: 'GST not found' });
    }
    
    res.json({ success: true, gst });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



// Update GST
const updateGST = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const gst = await GST.findByIdAndUpdate(id, updates, { new: true });
    if (!gst) {
      return res.status(404).json({ success: false, error: 'GST not found' });
    }
    
    res.json({ success: true, gst });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete GST (soft delete)
const deleteGST = async (req, res) => {
  try {
    const { id } = req.params;
    const gst = await GST.findByIdAndDelete(id);
    
    if (!gst) {
      return res.status(404).json({ success: false, error: 'GST not found' });
    }
    
    res.json({ success: true, message: 'GST deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createGST,
  getAllGSTs,
  getGSTById,
  updateGST,
  deleteGST
};
