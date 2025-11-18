const Table = require('../models/Table');
const RestaurantOrder = require('../models/RestaurantOrder');

// Get all tables
exports.getAllTables = async (req, res) => {
  try {
    const { location, status } = req.query;
    const filter = {};
    
    if (location) filter.location = location;
    if (status) filter.status = status;
    
    const tables = await Table.find(filter).sort({ tableNumber: 1 });
    
    // Ensure all tables have status field
    const tablesWithStatus = tables.map(table => ({
      ...table.toObject(),
      status: table.status || 'available'
    }));
    
    res.json({ success: true, tables: tablesWithStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create table
exports.createTable = async (req, res) => {
  try {
    const { capacity } = req.body;
    
    if (capacity && capacity > 4) {
      return res.status(400).json({ error: 'Table capacity cannot exceed 4 people' });
    }
    
    const table = new Table(req.body);
    await table.save();
    
    // 🔥 WebSocket: Emit new table created
    const io = req.app.get('io');
    if (io) {
      io.to('waiters').emit('table-created', {
        table
      });
    }
    
    res.status(201).json({ success: true, table });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update table
exports.updateTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { capacity } = req.body;
    
    if (capacity && capacity > 4) {
      return res.status(400).json({ error: 'Table capacity cannot exceed 4 people' });
    }
    
    const table = await Table.findByIdAndUpdate(tableId, req.body, { new: true });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // 🔥 WebSocket: Emit table updated
    const io = req.app.get('io');
    if (io) {
      io.to('waiters').emit('table-updated', {
        table
      });
    }
    
    res.json({ success: true, table });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update table status
exports.updateTableStatus = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { status } = req.body;
    
    const table = await Table.findByIdAndUpdate(
      tableId,
      { status },
      { new: true }
    );
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // 🔥 WebSocket: Emit table status update
    const io = req.app.get('io');
    if (io) {
      io.to('waiters').emit('table-status-updated', {
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: table.status
      });
    }
    
    res.json({ success: true, table });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update table status by table number
exports.updateTableStatusByNumber = async (req, res) => {
  try {
    const { tableNumber, status } = req.body;
    
    const table = await Table.findOneAndUpdate(
      { tableNumber },
      { status },
      { new: true }
    );
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json({ success: true, table });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete table
exports.deleteTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await Table.findByIdAndDelete(tableId);
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};