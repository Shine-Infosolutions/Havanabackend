const Item = require('../models/Items');

const itemController = {
  getAllItems: async (req, res) => {
    try {
      const items = await Item.find();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAvailableItems: async (req, res) => {
    try {
      const items = await Item.find({ status: 'available' });
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createItem: async (req, res) => {
    try {
      const item = new Item(req.body);
      await item.save();
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getItemById: async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateItem: async (req, res) => {
    try {
      const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteItem: async (req, res) => {
    try {
      const item = await Item.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = itemController;