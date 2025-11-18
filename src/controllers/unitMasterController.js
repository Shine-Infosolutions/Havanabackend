const Unit = require('../models/UnitMaster.js');

// Create a new unit
exports.createUnit = async (req, res) => {
  try {
    const { name, shortName } = req.body;
    const unit = new Unit({ name, shortName });
    await unit.save();
    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all units
exports.getUnits = async (req, res) => {
  try {
    const units = await Unit.find();
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a unit by ID
exports.getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a unit
exports.updateUnit = async (req, res) => {
  try {
    const { name, shortName } = req.body;
    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      { name, shortName },
      { new: true, runValidators: true }
    );
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a unit
exports.deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json({ message: 'Unit deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};