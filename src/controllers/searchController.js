const RestaurantOrder = require('../models/RestaurantOrder');
const KOT = require('../models/KOT');
const Bill = require('../models/Bill');
const Item = require('../models/Items');
const Table = require('../models/Table');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Room = require('../models/Room');

// Universal search across all models
exports.universalSearch = async (req, res) => {
  try {
    const { query, type, limit = 10 } = req.query;
    if (!query) return res.status(400).json({ error: 'Search query is required' });

    const searchLimit = parseInt(limit);
    const results = {};

    // Search in specific model if type is provided
    if (type) {
      results[type] = await searchInModel(type, query, searchLimit);
    } else {
      // Search across all models
      const models = ['orders', 'kots', 'bills', 'items', 'tables', 'users', 'bookings', 'rooms'];
      
      for (const modelType of models) {
        results[modelType] = await searchInModel(modelType, query, searchLimit);
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search in specific model
const searchInModel = async (type, query, limit) => {
  const searchRegex = new RegExp(query, 'i');
  
  try {
    switch (type) {
      case 'orders':
        return await RestaurantOrder.find({
          $or: [
            { staffName: searchRegex },
            { phoneNumber: searchRegex },
            { tableNo: searchRegex },
            { notes: searchRegex }
          ]
        }).limit(limit).populate('items.itemId', 'name');

      case 'kots':
        return await KOT.find({
          $or: [
            { kotNumber: searchRegex },
            { tableNo: searchRegex },
            { status: searchRegex }
          ]
        }).limit(limit).populate('items.itemId', 'name');

      case 'bills':
        return await Bill.find({
          $or: [
            { billNumber: searchRegex },
            { tableNo: searchRegex },
            { paymentMethod: searchRegex },
            { paymentStatus: searchRegex }
          ]
        }).limit(limit).populate('orderId', 'staffName');

      case 'items':
        return await Item.find({
          $or: [
            { name: searchRegex },
            { category: searchRegex },
            { description: searchRegex }
          ]
        }).limit(limit);

      case 'tables':
        return await Table.find({
          $or: [
            { tableNumber: searchRegex },
            { location: searchRegex },
            { status: searchRegex }
          ]
        }).limit(limit);

      case 'users':
        return await User.find({
          $or: [
            { username: searchRegex },
            { email: searchRegex },
            { role: searchRegex },
            { restaurantRole: searchRegex }
          ]
        }).limit(limit).select('-password');

      case 'bookings':
        return await Booking.find({
          $or: [
            { guestName: searchRegex },
            { phoneNumber: searchRegex },
            { email: searchRegex }
          ]
        }).limit(limit);

      case 'rooms':
        return await Room.find({
          $or: [
            { room_number: searchRegex },
            { room_type: searchRegex },
            { status: searchRegex }
          ]
        }).limit(limit);

      default:
        return [];
    }
  } catch (error) {
    console.error(`Error searching in ${type}:`, error);
    return [];
  }
};

// Search by specific field
exports.searchByField = async (req, res) => {
  try {
    const { model, field, value, limit = 10 } = req.query;
    
    if (!model || !field || !value) {
      return res.status(400).json({ error: 'Model, field, and value are required' });
    }

    const results = await searchBySpecificField(model, field, value, parseInt(limit));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchBySpecificField = async (model, field, value, limit) => {
  const searchRegex = new RegExp(value, 'i');
  const filter = { [field]: searchRegex };

  switch (model) {
    case 'orders':
      return await RestaurantOrder.find(filter).limit(limit);
    case 'kots':
      return await KOT.find(filter).limit(limit);
    case 'bills':
      return await Bill.find(filter).limit(limit);
    case 'items':
      return await Item.find(filter).limit(limit);
    case 'tables':
      return await Table.find(filter).limit(limit);
    case 'users':
      return await User.find(filter).limit(limit).select('-password');
    default:
      return [];
  }
};