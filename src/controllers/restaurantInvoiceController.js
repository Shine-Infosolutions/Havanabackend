const RestaurantInvoice = require('../models/RestaurantInvoice');

// Create or update restaurant invoice
const saveRestaurantInvoice = async (req, res) => {
  try {
    const { orderId, clientDetails } = req.body;
    
    const invoice = await RestaurantInvoice.findOneAndUpdate(
      { orderId },
      { clientDetails },
      { new: true, upsert: true }
    );
    
    res.status(200).json({ success: true, invoice });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get restaurant invoice by order ID
const getRestaurantInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const invoice = await RestaurantInvoice.findOne({ orderId });
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  saveRestaurantInvoice,
  getRestaurantInvoice
};