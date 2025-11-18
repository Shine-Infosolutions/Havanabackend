// Pagination utility functions
const paginate = (query, page = 1, limit = 15) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  return query.skip(skip).limit(limitNum);
};

const getPaginationMeta = async (model, filter = {}, page = 1, limit = 15) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const total = await model.countDocuments(filter);
  const totalPages = Math.ceil(total / limitNum);
  
  return {
    currentPage: pageNum,
    totalPages,
    totalItems: total,
    itemsPerPage: limitNum,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1
  };
};
const User = require('../models/User');
const RestaurantOrder = require('../models/RestaurantOrder');
const KOT = require('../models/KOT');
const Bill = require('../models/Bill');
const Item = require('../models/Items');
const Table = require('../models/Table');
const Booking = require('../models/Booking');

// Model mapping
const models = {
  users: User,
  orders: RestaurantOrder,
  kots: KOT,
  bills: Bill,
  items: Item,
  tables: Table,
  bookings: Booking
};

// Generic pagination controller
exports.getPaginatedData = async (req, res) => {
  try {
    const { model } = req.params;
    const { page = 1, limit = 15, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const Model = models[model];
    if (!Model) {
      return res.status(400).json({ error: 'Invalid model specified' });
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Build query with exclusions for sensitive data
    let query = Model.find();
    if (model === 'users') {
      query = query.select('-password');
    }
    query = query.sort(sort);
    
    // Apply pagination
    const data = await paginate(query, page, limit);
    const pagination = await getPaginationMeta(Model, {}, page, limit);
    
    res.json({
      data,
      pagination,
      model
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Filtered pagination
exports.getFilteredPaginatedData = async (req, res) => {
  try {
    const { model } = req.params;
    const { page = 1, limit = 15, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filters = req.body;
    
    const Model = models[model];
    if (!Model) {
      return res.status(400).json({ error: 'Invalid model specified' });
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let query = Model.find(filters);
    if (model === 'users') {
      query = query.select('-password');
    }
    query = query.sort(sort);
    
    const data = await paginate(query, page, limit);
    const pagination = await getPaginationMeta(Model, filters, page, limit);
    
    res.json({
      data,
      pagination,
      model,
      filters
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};