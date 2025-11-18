const PantryItem = require("../models/PantryItem");
const PantryOrder = require("../models/PantryOrder");
const ExcelJS = require('exceljs');

// Auto-create vendor order for out-of-stock items
exports.autoCreateVendorOrder = async (outOfStockItems, orderedBy) => {
  try {
    const Vendor = require('../models/Vendor');
    
    // Find the best vendor based on past performance
    const vendors = await Vendor.find({ isActive: true });
    if (vendors.length === 0) {
      console.log('No active vendor found for auto-ordering');
      return null;
    }

    // Get vendor performance stats
    let bestVendor = vendors[0]; // Default to first vendor
    let bestScore = -1;

    for (const vendor of vendors) {
      const orders = await PantryOrder.find({ 
        vendorId: vendor._id,
        orderType: 'Pantry to vendor'
      });
      
      const totalOrders = orders.length;
      const fulfilledOrders = orders.filter(o => o.status === 'fulfilled').length;
      const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) : 0;
      
      // Score based on fulfillment rate and total orders (experience)
      const score = fulfillmentRate * 0.7 + Math.min(totalOrders / 10, 1) * 0.3;
      
      if (score > bestScore) {
        bestScore = score;
        bestVendor = vendor;
      }
    }

    const vendorOrderItems = outOfStockItems.map(item => ({
      itemId: item.itemId,
      quantity: item.neededQuantity,
      unitPrice: item.estimatedPrice || 0
    }));

    const totalAmount = vendorOrderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const vendorOrder = new PantryOrder({
      items: vendorOrderItems,
      totalAmount,
      vendorId: bestVendor._id,
      status: 'pending',
      orderType: 'Pantry to vendor',
      specialInstructions: `Auto-generated order for out-of-stock items: ${outOfStockItems.map(i => i.name).join(', ')}. Selected vendor based on ${(bestScore * 100).toFixed(1)}% performance score.`,
      orderedBy
    });

    await vendorOrder.save();
    await vendorOrder.populate([
      { path: 'vendorId', select: 'name phone email' },
      { path: 'orderedBy', select: 'username email' }
    ]);

    console.log(`Auto-created vendor order with ${bestVendor.name} (score: ${(bestScore * 100).toFixed(1)}%):`, vendorOrder._id);
    return vendorOrder;
  } catch (error) {
    console.error('Failed to auto-create vendor order:', error);
    return null;
  }
};

// Get all pantry items with category details
exports.getAllPantryItems = async (req, res) => {
  try {
    let items = await PantryItem.find()
      .populate("category", "name description")
      .populate("unit", "name shortName")
      .sort({ name: 1 });

    // Calculate isLowStock
    items = items.map(item => {
      item = item.toObject(); // convert Mongoose doc to plain object
      item.isLowStock = item.stockQuantity <= 20;
      return item;
    });

    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get low stock pantry items
exports.getLowStockPantryItems = async (req, res) => {
  try {
    const items = await PantryItem.find({ stockQuantity: { $lte: 20 } })
      .populate("category", "name description")
      .populate("unit", "name shortName")
      .sort({ name: 1 });

    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create pantry item with category details
exports.createPantryItem = async (req, res) => {
  try {
    const item = new PantryItem(req.body);
    await item.save();
    const populatedItem = await item.populate([
      { path: "category", select: "name description" },
      { path: "unit", select: "name shortName" }
    ]);
    res.status(201).json({ success: true, item: populatedItem });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update pantry item with category details
exports.updatePantryItem = async (req, res) => {
  try {
    let item = await PantryItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return res.status(404).json({ error: "Pantry item not found" });

    item = await item.populate([
      { path: "category", select: "name description" },
      { path: "unit", select: "name shortName" }
    ]);
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete pantry item
exports.deletePantryItem = async (req, res) => {
  try {
    const item = await PantryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Pantry item not found" });

    res.json({ success: true, message: "Pantry item deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create pantry order (kitchen to pantry or pantry to reception)
exports.createPantryOrder = async (req, res) => {
  try {
    // Check and drop the problematic orderNumber index if it exists
    try {
      const indexes = await PantryOrder.collection.indexes();
      const hasOrderNumberIndex = indexes.some(index => index.name === 'orderNumber_1');
      if (hasOrderNumberIndex) {
        await PantryOrder.collection.dropIndex('orderNumber_1');
        console.log('Dropped orderNumber_1 index');
      }
    } catch (e) {
      console.log('Index handling:', e.message);
    }
    
    let outOfStockItems = [];
    let availableItems = [];
    let autoVendorOrder = null;

    // Check stock availability and separate available vs out-of-stock items
    if (req.body.orderType === 'Kitchen to Pantry') {
      for (const item of req.body.items) {
        const pantryItem = await PantryItem.findById(item.itemId || item.pantryItemId);
        if (!pantryItem) {
          return res.status(404).json({ error: `Item ${item.itemId || item.pantryItemId} not found` });
        }
        
        if (pantryItem.stockQuantity < item.quantity) {
          // Item is out of stock or insufficient
          const neededQuantity = item.quantity - pantryItem.stockQuantity;
          outOfStockItems.push({
            itemId: pantryItem._id,
            name: pantryItem.name,
            requestedQuantity: item.quantity,
            availableQuantity: pantryItem.stockQuantity,
            neededQuantity: Math.max(neededQuantity, pantryItem.minStockLevel || 10),
            estimatedPrice: pantryItem.price || 0
          });
          
          // If there's some stock available, add it to available items
          if (pantryItem.stockQuantity > 0) {
            availableItems.push({
              ...item,
              quantity: pantryItem.stockQuantity,
              unitPrice: item.unitPrice
            });
          }
        } else {
          // Item has sufficient stock
          availableItems.push(item);
        }
      }

      // Auto-create vendor order for out-of-stock items
      if (outOfStockItems.length > 0) {
        autoVendorOrder = await exports.autoCreateVendorOrder(outOfStockItems, req.user?.id || req.body.orderedBy);
      }
    }

    // Validate stock availability for Pantry to Kitchen orders
    if (req.body.orderType === 'Pantry to Kitchen') {
      for (const item of req.body.items) {
        const pantryItem = await PantryItem.findById(item.itemId || item.pantryItemId);
        if (!pantryItem) {
          return res.status(404).json({ error: `Item ${item.itemId || item.pantryItemId} not found` });
        }
        if (pantryItem.stockQuantity < item.quantity) {
          return res.status(400).json({ 
            error: `Insufficient stock for ${pantryItem.name}. Available: ${pantryItem.stockQuantity}, Requested: ${item.quantity}` 
          });
        }
      }
    }

    // For Kitchen to Pantry orders, keep original items with original quantities
    let itemsToOrder, totalAmount;
    if (req.body.orderType === 'Kitchen to Pantry') {
      itemsToOrder = req.body.items.map(originalItem => {
        const availableItem = availableItems.find(ai => ai.itemId === originalItem.itemId || ai.pantryItemId === originalItem.pantryItemId);
        const outOfStockItem = outOfStockItems.find(oos => oos.itemId.toString() === (originalItem.itemId || originalItem.pantryItemId));
        return {
          ...originalItem,
          availableQuantity: availableItem ? availableItem.quantity : 0,
          isOutOfStock: !availableItem || availableItem.quantity === 0
        };
      });
      totalAmount = availableItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    } else {
      itemsToOrder = req.body.items;
      totalAmount = req.body.totalAmount;
    }

    const orderData = {
      ...req.body,
      items: itemsToOrder,
      totalAmount,
      orderedBy: req.user?.id || req.body.orderedBy,
      packagingCharge: req.body.packagingCharge || 0,
      labourCharge: req.body.labourCharge || 0,
      // Store original request for Kitchen to Pantry orders
      originalRequest: req.body.orderType === 'Kitchen to Pantry' ? {
        items: req.body.items,
        outOfStockItems: outOfStockItems
      } : undefined
    };

    // If order type is "Pantry to Kitchen", set initial status and handle kitchen store update
    if (req.body.orderType === 'Pantry to Kitchen') {
      orderData.status = 'fulfilled';
      orderData.deliveredAt = new Date();
      orderData.fulfillment = {
        fulfilledAt: new Date(),
        fulfilledBy: req.user?.id,
        notes: 'Automatically fulfilled - items sent to kitchen store'
      };
    }

    const order = new PantryOrder(orderData);
    await order.save();
    console.log('Pantry order saved:', order._id);

    // If order type is "Pantry to Kitchen", create corresponding kitchen order
    if (req.body.orderType === 'Pantry to Kitchen') {
      try {
        const KitchenOrder = require('../models/KitchenOrder');
        
        // Populate items to get item details
        await order.populate({
          path: 'items.itemId',
          select: 'name unit',
          populate: {
            path: 'unit',
            select: 'name shortName'
          }
        });
        
        // Create corresponding kitchen order
        const kitchenOrder = new KitchenOrder({
          items: order.items,
          totalAmount: order.totalAmount,
          status: 'delivered', // Items are directly delivered to kitchen
          orderType: 'pantry_to_kitchen',
          specialInstructions: order.specialInstructions,
          orderedBy: order.orderedBy,
          pantryOrderId: order._id,
          receivedAt: new Date()
        });
        
        await kitchenOrder.save();
        console.log('Kitchen order created:', kitchenOrder._id);
        
        // Reduce pantry item stock
        for (const item of order.items) {
          await PantryItem.findByIdAndUpdate(item.itemId, {
            $inc: { stockQuantity: -Number(item.quantity) }
          });
        }
        
        // Add items to kitchen store
        const KitchenStore = require('../models/KitchenStore');
        for (const orderItem of order.items) {
          let kitchenItem = await KitchenStore.findOne({ 
            name: orderItem.itemId.name 
          });
          
          if (kitchenItem) {
            kitchenItem.quantity = Number(kitchenItem.quantity) + Number(orderItem.quantity);
            await kitchenItem.save();
          } else {
            kitchenItem = new KitchenStore({
              name: orderItem.itemId.name,
              category: 'Food',
              quantity: Number(orderItem.quantity),
              unit: orderItem.itemId.unit || 'pcs'
            });
            await kitchenItem.save();
          }
        }
        
        console.log('Items added to kitchen store and kitchen order created');
      } catch (error) {
        console.error('Failed to create kitchen order:', error);
      }
    }

    // Populate both orderedBy and vendorId (skip if already populated)
    if (!order.populated('orderedBy')) {
      await order.populate([
        { path: "orderedBy", select: "username email" },
        { path: "vendorId", select: "name phone email" }
      ]);
    }

    // Prepare response with vendor order info if created
    const response = { 
      success: true, 
      order,
      outOfStockItems: outOfStockItems.length > 0 ? outOfStockItems : undefined,
      autoVendorOrder: autoVendorOrder || undefined,
      message: outOfStockItems.length > 0 
        ? `Order created with available items. Vendor order auto-created for ${outOfStockItems.length} out-of-stock items.`
        : 'Order created successfully'
    };

    // Emit WebSocket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('pantry-order-created', {
        type: 'created',
        order: order
      });
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Create pantry order error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get pantry orders
exports.getPantryOrders = async (req, res) => {
  try {
    const { orderType, status } = req.query;
    const filter = {};

    if (orderType) filter.orderType = orderType;
    if (status) filter.status = status;

    const orders = await PantryOrder.find(filter)
      .populate("orderedBy", "username email")
      .populate("vendorId", "name phone email")
      .populate({
        path: "items.itemId",
        select: "name unit price costPerUnit description category",
        populate: [
          {
            path: "category",
            select: "name"
          },
          {
            path: "unit",
            select: "name shortName"
          }
        ]
      })
      .sort({ createdAt: -1 });

    // Handle deleted items by adding fallback names
    const ordersWithFallback = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.map(item => {
        if (!item.itemId || !item.itemId.name) {
          // Check if we have original request data
          const originalItem = order.originalRequest?.items?.find(orig => 
            orig.itemId === (item.itemId?._id?.toString() || item.itemId?.toString())
          );
          
          return {
            ...item,
            itemId: {
              _id: item.itemId?._id || item.itemId,
              name: originalItem?.name || 'Deleted Item',
              unit: originalItem?.unit || item.unit || 'pcs',
              price: item.unitPrice || 0
            }
          };
        }
        return item;
      });
      return orderObj;
    });

    res.json({ success: true, orders: ordersWithFallback });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update pantry order
exports.updatePantryOrder = async (req, res) => {
  try {
    // If status is being updated, handle stock updates first
    if (req.body.status) {
      const existingOrder = await PantryOrder.findById(req.params.id);
      if (existingOrder && existingOrder.orderType === 'Pantry to vendor' && ["delivered", "fulfilled"].includes(req.body.status)) {
        console.log('Processing vendor order fulfillment via update - updating pantry stock');
        for (const item of existingOrder.items) {
          console.log(`Adding ${item.quantity} of item ${item.itemId} to pantry stock`);
          const result = await PantryItem.findByIdAndUpdate(item.itemId, {
            $inc: { stockQuantity: Number(item.quantity) }
          }, { new: true });
          console.log(`Updated item stock:`, result?.name, result?.stockQuantity);
        }
        req.body.deliveredAt = new Date();
        console.log('Pantry stock updated successfully via update endpoint');
      }
    }
    
    const order = await PantryOrder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    await order.populate([
      { path: "orderedBy", select: "username email" },
      { path: "vendorId", select: "name phone email" }
    ]);

    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update pantry order status
exports.updatePantryOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await PantryOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status;

    // If Kitchen to Pantry order is approved, reduce pantry stock and update kitchen order
    if (order.orderType === 'Kitchen to Pantry' && (status === 'approved' || status === 'fulfilled')) {
      console.log('=== PROCESSING KITCHEN TO PANTRY APPROVAL ===');
      console.log('Order ID:', order._id);
      console.log('Order items:', JSON.stringify(order.items, null, 2));
      console.log('Existing kitchenOrderId:', order.kitchenOrderId);
      
      try {
        const KitchenOrder = require('../models/KitchenOrder');
        const KitchenStore = require('../models/KitchenStore');
        
        // Populate items to get item details
        await order.populate({
          path: 'items.itemId',
          select: 'name unit',
          populate: {
            path: 'unit',
            select: 'name shortName'
          }
        });
        console.log('Populated order items:', JSON.stringify(order.items, null, 2));
        
        const processedItems = [];
        let totalProcessedAmount = 0;
        
        // Process each item
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          console.log(`\n--- Processing item ${i + 1}/${order.items.length} ---`);
          console.log('Item data:', JSON.stringify(item, null, 2));
          
          // Check current pantry stock
          const pantryItem = await PantryItem.findById(item.itemId._id || item.itemId);
          if (!pantryItem) {
            console.log(`Pantry item not found for ID: ${item.itemId._id || item.itemId}`);
            continue;
          }
          
          console.log(`Pantry item found: ${pantryItem.name}, current stock: ${pantryItem.stockQuantity}`);
          
          // Calculate available quantity - use what's actually available in pantry
          const requestedQty = Number(item.quantity);
          const availableQty = Math.min(pantryItem.stockQuantity, requestedQty);
          console.log(`Requested: ${requestedQty}, Available: ${availableQty}`);
          
          if (availableQty > 0) {
            console.log(`Processing ${availableQty} units of ${pantryItem.name}`);
            
            // Reduce pantry stock (pantry sends items to kitchen)
            const updatedPantryItem = await PantryItem.findByIdAndUpdate(pantryItem._id, {
              $inc: { stockQuantity: -Number(availableQty) }
            }, { new: true });
            console.log(`Pantry stock reduced: ${pantryItem.name} now has ${updatedPantryItem.stockQuantity}`);
            
            // Add items to kitchen store (pantry sends to kitchen)
            let kitchenItem = await KitchenStore.findOne({ name: pantryItem.name });
            if (kitchenItem) {
              const oldQuantity = Number(kitchenItem.quantity);
              kitchenItem.quantity = oldQuantity + availableQty;
              await kitchenItem.save();
              console.log(`Updated kitchen store: ${pantryItem.name} ${oldQuantity} + ${availableQty} = ${kitchenItem.quantity}`);
            } else {
              kitchenItem = new KitchenStore({
                name: pantryItem.name,
                category: pantryItem.category?.name || 'Food',
                quantity: availableQty,
                unit: pantryItem.unit || 'pcs'
              });
              await kitchenItem.save();
              console.log(`Created new kitchen store item: ${pantryItem.name} with ${availableQty}`);
            }
            
            // Add to processed items for kitchen order tracking
            processedItems.push({
              itemId: item.itemId,
              quantity: availableQty,
              unitPrice: item.unitPrice || 0
            });
            totalProcessedAmount += availableQty * (item.unitPrice || 0);
          } else {
            console.log(`Skipping item ${pantryItem.name} - no available quantity`);
          }
        }
        
        // Create or update kitchen order (always create to acknowledge the request)
        let kitchenOrder;
        if (order.kitchenOrderId) {
            // Update existing kitchen order
            kitchenOrder = await KitchenOrder.findByIdAndUpdate(order.kitchenOrderId, {
              status: 'delivered',
              receivedAt: new Date(),
              items: processedItems,
              totalAmount: totalProcessedAmount
            }, { new: true });
            console.log('Updated existing kitchen order:', kitchenOrder._id);
        } else {
          
          // Create kitchen order with delivered status
          kitchenOrder = new KitchenOrder({
              items: processedItems,
              totalAmount: totalProcessedAmount,
              status: 'delivered',
              orderType: 'kitchen_to_pantry',
              specialInstructions: order.specialInstructions || `Items transferred from pantry order ${order._id}`,
              orderedBy: order.orderedBy,
              pantryOrderId: order._id,
              receivedAt: new Date()
            });
            const savedKitchenOrder = await kitchenOrder.save();
            console.log('Created kitchen order with delivered status:', savedKitchenOrder._id);
            
            // Populate the kitchen order for WebSocket emission
            await savedKitchenOrder.populate({
              path: 'items.itemId',
              select: 'name unit',
              populate: {
                path: 'unit',
                select: 'name shortName'
              }
            });
            
            // Emit WebSocket event for kitchen order creation
            const io = req.app.get('io');
            if (io) {
              io.emit('kitchen-order-created', {
                type: 'created',
                order: savedKitchenOrder
              });
              console.log('WebSocket event emitted for kitchen order creation');
            }
            
          // Link kitchen order back to pantry order
          order.kitchenOrderId = savedKitchenOrder._id;
        }
        
        console.log('=== KITCHEN TO PANTRY PROCESSING COMPLETED ===');
        order.status = 'fulfilled';
        order.deliveredAt = new Date();
      } catch (error) {
        console.error('=== ERROR IN KITCHEN TO PANTRY PROCESSING ===');
        console.error('Error details:', error);
        console.error('Stack trace:', error.stack);
        // Don't change status if there was an error
        return res.status(500).json({ error: 'Failed to process kitchen to pantry order: ' + error.message });
      }
    }

    // For vendor orders - add stock when delivered/fulfilled
    if (order.orderType === 'Pantry to vendor' && ["delivered", "fulfilled"].includes(status)) {
      console.log('Processing vendor order fulfillment - updating pantry stock');
      order.deliveredAt = new Date();
      for (const item of order.items) {
        console.log(`Adding ${item.quantity} of item ${item.itemId} to pantry stock`);
        const result = await PantryItem.findByIdAndUpdate(item.itemId, {
          $inc: { stockQuantity: Number(item.quantity) }
        }, { new: true });
        console.log(`Updated item stock:`, result?.name, result?.stockQuantity);
      }
      console.log('Pantry stock updated successfully');
    }

    await order.save();

    await order.populate([
      { path: "orderedBy", select: "username email" },
      { path: "vendorId", select: "name phone email" }
    ]);

    console.log(`Pantry order ${req.params.id} status updated to: ${status}`);
    console.log('Final order status:', order.status);
    
    // Emit WebSocket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('pantry-order-updated', {
        type: 'updated',
        order
      });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Update pantry order status error:', error);
    res.status(400).json({ error: error.message });
  }
};


// Update pantry item stock
exports.updatePantryStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'
    const item = await PantryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Pantry item not found" });
    }

    if (operation === "add") {
      item.currentStock += quantity;
    } else if (operation === "subtract") {
      item.currentStock = Math.max(0, item.currentStock - quantity);
    }

    await item.save();
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Generate invoice for low stock items
exports.generateLowStockInvoice = async (req, res) => {
  try {
    const lowStockItems = await PantryItem.find({ 
      stockQuantity: { $lte: 20 }
    }).sort({ name: 1 });

    if (lowStockItems.length === 0) {
      return res.status(404).json({ error: "No low stock items found" });
    }

    const invoice = {
      invoiceNumber: `LSI-${Date.now()}`,
      generatedDate: new Date(),
      generatedBy: req.user?.id || 'system',
      title: "Low Stock Items Invoice",
      items: lowStockItems.map((item) => ({
        name: item.name,
        category: item.category,
        currentStock: item.stockQuantity,
        minStockLevel: 20,
        unit: item.unit,
        shortfall: Math.max(0, 20 - item.stockQuantity),
        estimatedCost: item.costPerUnit || 0,
        totalCost: Math.max(0, 20 - item.stockQuantity) * (item.costPerUnit || 0)
      })),
      totalItems: lowStockItems.length,
      totalEstimatedCost: lowStockItems.reduce(
        (sum, item) =>
          sum + (Math.max(0, 20 - item.stockQuantity) * (item.costPerUnit || 0)),
        0
      )
    };
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pantry order by ID
exports.getPantryOrderById = async (req, res) => {
  try {
    const order = await PantryOrder.findById(req.params.id)
      .populate("orderedBy", "username email")
      .populate("vendorId", "name phone email")
      .populate({
        path: "items.itemId",
        select: "name unit price costPerUnit description category",
        populate: [
          {
            path: "category",
            select: "name"
          },
          {
            path: "unit",
            select: "name shortName"
          }
        ]
      });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Handle deleted items by adding fallback names
    const orderObj = order.toObject();
    orderObj.items = orderObj.items.map(item => {
      if (!item.itemId || !item.itemId.name) {
        // Check if we have original request data
        const originalItem = order.originalRequest?.items?.find(orig => 
          orig.itemId === (item.itemId?._id?.toString() || item.itemId?.toString())
        );
        
        return {
          ...item,
          itemId: {
            _id: item.itemId?._id || item.itemId,
            name: originalItem?.name || 'Deleted Item',
            unit: originalItem?.unit || item.unit || 'pcs',
            price: item.unitPrice || 0
          }
        };
      }
      return item;
    });

    res.json({ success: true, order: orderObj });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a pantry order by ID
exports.deletePantryOrder = async (req, res) => {
  try {
    const order = await PantryOrder.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Pantry order not found" });
    }

    res.json({ success: true, message: "Pantry order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate invoice for Reception to Vendor orders
exports.generateVendorInvoice = async (req, res) => {
  try {
    const vendorOrders = await PantryOrder.find({
      orderType: 'Reception to Vendor',
      status: { $in: ['pending', 'ready'] }
    })
    .populate('vendorId', 'name phone email')
    .populate('items.itemId', 'name unit costPerUnit')
    .populate('orderedBy', 'username email');

    if (!vendorOrders.length) {
      return res.status(404).json({ error: 'No Reception to Vendor orders found' });
    }

    const invoice = vendorOrders.map(order => ({
      orderNumber: order.orderNumber,
      vendor: order.vendorId ? {
        name: order.vendorId.name,
        phone: order.vendorId.phone,
        email: order.vendorId.email
      } : { name: "Unknown Vendor" },
      totalAmount: order.totalAmount,
      items: order.items.map(i => ({
        name: i.itemId?.name || "Deleted Item",
        quantity: i.quantity,
        unit: i.itemId?.unit || "",
        unitPrice: i.unitPrice,
        total: i.quantity * i.unitPrice
      })),
      specialInstructions: order.specialInstructions,
      orderedBy: order.orderedBy,
      createdAt: order.createdAt
    }));

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload pricing image for fulfillment
exports.uploadPricingImage = async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image || !image.base64) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const base64Data = image.base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const timestamp = Date.now();
    const filename = `pricing-${timestamp}-${image.name || 'image.jpg'}`;
    const filepath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    
    const imageUrl = `/uploads/${filename}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fulfill invoice with pricing image and amount tracking
exports.fulfillInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newAmount, pricingImage, chalanImage, notes } = req.body;

    const order = await PantryOrder.findById(orderId)
      .populate('vendorId', 'name phone email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }



    const previousAmount = order.totalAmount;
    const difference = newAmount - previousAmount;

    order.fulfillment = {
      previousAmount,
      newAmount,
      difference,
      pricingImage,
      chalanImage,
      fulfilledAt: new Date(),
      fulfilledBy: req.user?.id,
      notes
    };
    order.status = 'fulfilled';
    order.totalAmount = newAmount;

    await order.save();



    await order.populate([
      { path: 'orderedBy', select: 'username email' },
      { path: 'fulfillment.fulfilledBy', select: 'username email' }
    ]);

    res.json({ 
      success: true, 
      order,
      fulfillment: {
        previousAmount,
        newAmount,
        difference,
        message: difference > 0 ? 'Amount increased' : difference < 0 ? 'Amount decreased' : 'No change in amount'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get fulfillment history for an order
exports.getFulfillmentHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await PantryOrder.findById(orderId)
      .populate('fulfillment.fulfilledBy', 'username email')
      .populate('vendorId', 'name phone email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ 
      success: true, 
      fulfillment: order.fulfillment,
      orderDetails: {
        id: order._id,
        vendor: order.vendorId,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate Excel report for pantry orders with date range filter
exports.generatePantryOrdersExcel = async (req, res) => {
  try {
    const { startDate, endDate, orderType, status } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (orderType) filter.orderType = orderType;
    if (status) filter.status = status;

    const orders = await PantryOrder.find(filter)
      .populate('orderedBy', 'username email')
      .populate('vendorId', 'name phone email')
      .populate('items.itemId', 'name unit')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pantry Orders');

    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 15 },
      { header: 'Order Type', key: 'orderType', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Ordered By', key: 'orderedBy', width: 20 },
      { header: 'Vendor', key: 'vendor', width: 20 },
      { header: 'Items', key: 'items', width: 40 },
      { header: 'Special Instructions', key: 'specialInstructions', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Delivered At', key: 'deliveredAt', width: 20 }
    ];

    orders.forEach(order => {
      const itemsText = order.items.map(item => 
        `${item.itemId?.name || 'Unknown'} (${item.quantity} ${item.itemId?.unit || ''})`
      ).join(', ');

      worksheet.addRow({
        orderId: order._id.toString(),
        orderType: order.orderType,
        status: order.status,
        totalAmount: order.totalAmount,
        orderedBy: order.orderedBy?.username || 'Unknown',
        vendor: order.vendorId?.name || 'N/A',
        items: itemsText,
        specialInstructions: order.specialInstructions || '',
        createdAt: order.createdAt.toLocaleDateString(),
        deliveredAt: order.deliveredAt ? order.deliveredAt.toLocaleDateString() : 'N/A'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pantry-orders-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate Excel report for pantry items with date range filter
exports.generatePantryItemsExcel = async (req, res) => {
  try {
    const { startDate, endDate, category, lowStock } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (category) filter.category = category;
    if (lowStock === 'true') filter.stockQuantity = { $lte: 20 };

    const items = await PantryItem.find(filter)
      .populate('category', 'name description')
      .sort({ name: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pantry Items');

    worksheet.columns = [
      { header: 'Item ID', key: 'itemId', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Stock Quantity', key: 'stockQuantity', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Cost Per Unit', key: 'costPerUnit', width: 15 },
      { header: 'Low Stock', key: 'lowStock', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    items.forEach(item => {
      worksheet.addRow({
        itemId: item._id.toString(),
        name: item.name,
        category: item.category?.name || 'N/A',
        stockQuantity: item.stockQuantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit || 0,
        lowStock: item.stockQuantity <= 20 ? 'Yes' : 'No',
        description: item.description || '',
        createdAt: item.createdAt ? item.createdAt.toLocaleDateString() : 'N/A'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pantry-items-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload chalan from store
exports.uploadChalan = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is required' });
    }
    const { orderId, image } = req.body;
    
    if (!image || !image.base64) {
      return res.status(400).json({ error: 'Chalan image is required' });
    }
    
    // Update order with chalan base64
    if (orderId) {
      await PantryOrder.findByIdAndUpdate(orderId, {
        chalanImage: image.base64,
        'fulfillment.chalanImage': image.base64
      });
    }
    
    res.json({ success: true, chalanUrl: image.base64 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Disburse items from store to kitchen
exports.disburseToKitchen = async (req, res) => {
  try {
    const { items, notes } = req.body;
    const Disbursement = require('../models/Disbursement');
    
    const disbursementData = {
      disbursementNumber: `DSB-${Date.now()}`,
      items: [],
      totalItems: 0,
      disbursedBy: req.user?.id,
      disbursedAt: new Date(),
      notes
    };

    for (const item of items) {
      const pantryItem = await PantryItem.findById(item.itemId);
      
      if (!pantryItem) {
        return res.status(404).json({ error: `Item ${item.itemId} not found` });
      }
      
      if (pantryItem.stockQuantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${pantryItem.name}. Available: ${pantryItem.stockQuantity}` 
        });
      }
      
      // Decrease pantry stock
      pantryItem.stockQuantity -= item.quantity;
      await pantryItem.save();
      
      disbursementData.items.push({
        itemId: item.itemId,
        itemName: pantryItem.name,
        quantity: item.quantity,
        unit: pantryItem.unit
      });
      
      disbursementData.totalItems += item.quantity;
    }

    // Save disbursement to database
    const disbursement = new Disbursement(disbursementData);
    await disbursement.save();

    res.json({ success: true, disbursement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get disbursement history
exports.getDisbursementHistory = async (req, res) => {
  try {
    const Disbursement = require('../models/Disbursement');
    
    const disbursements = await Disbursement.find()
      .populate('items.itemId', 'name unit')
      .populate('disbursedBy', 'username email')
      .sort({ disbursedAt: -1 });

    res.json({ success: true, disbursements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update payment status for vendor orders
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, paidAmount, paymentMethod, transactionId, notes } = req.body;

    const order = await PantryOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow payment status updates for vendor orders
    if (order.orderType !== 'Pantry to vendor') {
      return res.status(400).json({ error: 'Payment status can only be updated for vendor orders' });
    }

    // Update payment status and details
    order.paymentStatus = paymentStatus;
    order.paymentDetails = {
      paidAmount: paidAmount || 0,
      paidAt: paymentStatus === 'paid' || paymentStatus === 'partial' ? new Date() : null,
      paymentMethod: paymentMethod || '',
      transactionId: transactionId || '',
      notes: notes || ''
    };

    await order.save();

    await order.populate([
      { path: 'orderedBy', select: 'username email' },
      { path: 'vendorId', select: 'name phone email' }
    ]);

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get vendor analytics
exports.getVendorAnalytics = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    if (!vendorId) {
      return res.status(400).json({ error: 'Vendor ID is required' });
    }

    // Get all orders for this vendor
    const vendorOrders = await PantryOrder.find({ vendorId })
      .populate('orderedBy', 'username email')
      .populate('vendorId', 'name phone email')
      .populate('items.itemId', 'name unit')
      .sort({ createdAt: -1 });

    // Calculate analytics
    const analytics = {
      vendorId,
      total: {
        orders: vendorOrders.length,
        amount: vendorOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        items: vendorOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)
      },
      statusBreakdown: {
        pending: vendorOrders.filter(o => o.status === 'pending').length,
        approved: vendorOrders.filter(o => o.status === 'approved').length,
        fulfilled: vendorOrders.filter(o => o.status === 'fulfilled').length,
        cancelled: vendorOrders.filter(o => o.status === 'cancelled').length
      },
      paymentBreakdown: {
        paid: vendorOrders.filter(o => o.paymentStatus === 'paid').length,
        pending: vendorOrders.filter(o => o.paymentStatus === 'pending').length,
        partial: vendorOrders.filter(o => o.paymentStatus === 'partial').length
      },
      recentOrders: vendorOrders.slice(0, 10),
      vendor: vendorOrders.length > 0 ? vendorOrders[0].vendorId : null
    };

    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get suggested vendors for auto-ordering
exports.getSuggestedVendors = async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    
    // Get all active vendors
    const vendors = await Vendor.find({ isActive: true }).sort({ name: 1 });
    
    // Get vendor order history to suggest best vendors
    const vendorStats = await Promise.all(vendors.map(async (vendor) => {
      const orders = await PantryOrder.find({ 
        vendorId: vendor._id,
        orderType: 'Pantry to vendor'
      });
      
      const totalOrders = orders.length;
      const fulfilledOrders = orders.filter(o => o.status === 'fulfilled').length;
      const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const avgAmount = totalOrders > 0 ? totalAmount / totalOrders : 0;
      const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) * 100 : 0;
      
      return {
        ...vendor.toObject(),
        stats: {
          totalOrders,
          fulfilledOrders,
          totalAmount,
          avgAmount,
          fulfillmentRate
        }
      };
    }));
    
    // Sort by fulfillment rate and total orders
    const suggestedVendors = vendorStats.sort((a, b) => {
      if (b.stats.fulfillmentRate !== a.stats.fulfillmentRate) {
        return b.stats.fulfillmentRate - a.stats.fulfillmentRate;
      }
      return b.stats.totalOrders - a.stats.totalOrders;
    });
    
    res.json({ success: true, vendors: suggestedVendors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};