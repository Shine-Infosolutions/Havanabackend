const Laundry = require('../models/Laundry');
const LaundryItem = require('../models/LaundryItem');

exports.createLaundryOrder = async (req, res) => {
  try {
    const laundry = new Laundry(req.body);
    await laundry.save();
    await laundry.populate('bookingId', 'roomNumber guestName');
    res.status(201).json({ success: true, laundry });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllLaundryOrders = async (req, res) => {
  try {
    const orders = await Laundry.find()
      .populate('bookingId', 'roomNumber guestName')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLaundryOrderById = async (req, res) => {
  try {
    const order = await Laundry.findById(req.params.id)
      .populate('bookingId', 'roomNumber guestName')
      .populate('processedBy', 'name');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLaundryOrder = async (req, res) => {
  try {
    const order = await Laundry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('bookingId', 'roomNumber guestName').populate('processedBy', 'name');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateLaundryStatus = async (req, res) => {
  try {
    const { status, deliveryDate } = req.body;
    const order = await Laundry.findByIdAndUpdate(
      req.params.id,
      { status, deliveryDate, processedBy: req.user.id },
      { new: true, runValidators: true }
    ).populate('bookingId', 'roomNumber guestName').populate('processedBy', 'name');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLaundryOrder = async (req, res) => {
  try {
    const order = await Laundry.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLaundryByRoom = async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const orders = await Laundry.find({ roomNumber })
      .populate('bookingId', 'roomNumber guestName')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLaundryByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const orders = await Laundry.find({ status })
      .populate('bookingId', 'roomNumber guestName')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Laundry Item Controllers
exports.createLaundryItem = async (req, res) => {
  try {
    const laundryItem = new LaundryItem(req.body);
    await laundryItem.save();
    res.status(201).json({ success: true, laundryItem });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllLaundryItems = async (req, res) => {
  try {
    const { category, serviceType, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (serviceType) filter.serviceType = serviceType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const items = await LaundryItem.find(filter).sort({ category: 1, itemName: 1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLaundryItemById = async (req, res) => {
  try {
    const item = await LaundryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Laundry item not found' });
    }
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLaundryItem = async (req, res) => {
  try {
    const item = await LaundryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ error: 'Laundry item not found' });
    }
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLaundryItem = async (req, res) => {
  try {
    const item = await LaundryItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Laundry item not found' });
    }
    res.json({ success: true, message: 'Laundry item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
