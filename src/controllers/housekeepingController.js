const Housekeeping = require('../models/Housekeeping');
const User = require('../models/User.js');
const Room = require('../models/Room');
const RoomInspection = require('../models/RoomInspection');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Invoice = require('../models/Invoice'); 
const RoomInventory = require('../models/RoomInventory');
const Booking = require('../models/Booking');


// 🔹 GET Checklist by RoomId (Auto-fill from RoomInventory or fallback to general inventory)
exports.getChecklistByRoom = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    let roomInventory = await RoomInventory.find({ roomId }).populate('inventoryId');

    // If no room-specific inventory, use general inventory items
    if (roomInventory.length === 0) {
      const generalInventory = await Inventory.find({});
      
      const checklist = generalInventory.map(item => ({
        item: item.name,
        inventoryId: item._id,
        quantity: 1,
        status: 'ok',
        remarks: '',
        costPerUnit: item.costPerUnit
      }));
      
      return res.json({ checklist });
    }

    const checklist = roomInventory.map(item => ({
      item: item.inventoryId.name,
      inventoryId: item.inventoryId._id,
      quantity: item.quantity,
      status: 'ok',
      remarks: ''
    }));

    res.json({ checklist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllRoomInspections = async (req, res) => {
  try {
    const inspections = await RoomInspection.find()
      .populate('roomId')
      .populate('bookingId')
      .populate('inspectedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ success: true, inspections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoomInspectionById = async (req, res) => {
  try {
    const { inspectionId } = req.params;

    const inspection = await RoomInspection.findById(inspectionId)
      .populate('roomId')
      .populate('bookingId')
      .populate('inspectedBy', 'username');

    if (!inspection) {
      return res.status(404).json({ error: 'RoomInspection not found' });
    }

    res.json({ success: true, inspection });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoomInspectionsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const inspections = await RoomInspection.find({ roomId })
      .populate('bookingId')
      .populate('inspectedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ success: true, inspections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoomInspectionsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const inspections = await RoomInspection.find({ bookingId })
      .populate('roomId')
      .populate('inspectedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ success: true, inspections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 POST Inspection Submission
exports.createRoomInspection = async (req, res) => {
  try {
    const { roomId, bookingId, inspectedBy, inspectionType, checklist } = req.body;

    // Validate required fields
    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }
    if (!inspectedBy) {
      return res.status(400).json({ error: 'inspectedBy is required' });
    }
    if (!checklist || !Array.isArray(checklist)) {
      return res.status(400).json({ error: 'checklist is required and must be an array' });
    }

    let totalCharges = 0;
    let invoiceItems = [];
    if (Inventory.currentStock <= 0) {
      console.warn(`Inventory ${Inventory.name} already out of stock`);
    }
    
    for (const item of checklist) {
      if (item.status !== 'ok') {
        let price = 0;
        let itemName = item.item || 'Unknown Item';
        
        // Handle fallback items (no inventoryId)
        if (item.inventoryId) {
          const inventory = await Inventory.findById(item.inventoryId);
          if (inventory) {
            price = inventory.costPerUnit || 0;
            itemName = inventory.name;
            
            // Inventory deduction for real inventory items
            if (['missing', 'used'].includes(item.status)) {
              const previousStock = inventory.currentStock;
              inventory.currentStock -= item.quantity;
              await inventory.save();

              await InventoryTransaction.create({
                inventoryId: inventory._id,
                userId: inspectedBy,
                quantity: item.quantity,
                transactionType: item.status,
                quantityChanged: -item.quantity,
                previousStock,
                newStock: inventory.currentStock,
                reason: `Room inspection - ${item.status}`,
                reference: bookingId
              });
            }
          }
        } else {
          // Use fallback price for items without inventoryId
          price = item.costPerUnit || 0;
        }
        
        const amount = price * item.quantity;
        totalCharges += amount;

        invoiceItems.push({
          itemName,
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          price,
          amount,
          status: item.status,
          remarks: item.remarks || ''
        });
      }
    }

    // Save RoomInspection
    const inspection = await RoomInspection.create({
      roomId,
      bookingId,
      inspectedBy,
      inspectionType,
     totalCharges,
      checklist
    });

    // Create Invoice if there are charges
    if (invoiceItems.length > 0) {
      const invoiceNumber = await generateInvoiceNumber();
      await Invoice.create({
        serviceType: 'Housekeeping',
        serviceRefId: inspection._id,
        invoiceNumber,
        bookingId,
        items: invoiceItems.map(i => ({
          description: `${i.itemName} (${i.status})`,
          amount: i.amount
        })),
        subTotal: totalCharges,
        tax: 0,
        discount: 0,
        totalAmount: totalCharges,
        paidAmount: 0,
        balanceAmount: totalCharges,
        status: 'Unpaid'
      });
    }

    res.json({
      message: "Inspection recorded successfully",
      totalCharges,
      invoiceItems,
      data: inspection
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRoomInspection = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const { checklist, inspectedBy } = req.body;

    const inspection = await RoomInspection.findById(inspectionId);
    if (!inspection) {
      return res.status(404).json({ message: 'RoomInspection not found' });
    }

    let totalCharges = 0;

    for (const updatedItem of checklist) {
      const index = inspection.checklist.findIndex(
        (i) => i.inventoryId?.toString() === updatedItem.inventoryId
      );

      if (index === -1) continue;

      // Update checklist item
      inspection.checklist[index].status = updatedItem.status;
      inspection.checklist[index].quantity = updatedItem.quantity || 1;
      inspection.checklist[index].remarks = updatedItem.remarks || '';

      // Get inventory details
      const inventory = await Inventory.findById(updatedItem.inventoryId);
      if (!inventory) continue;

      let cost = 0;

      if (['missing', 'damaged', 'used'].includes(updatedItem.status)) {
        const quantity = updatedItem.quantity || 1;

        // Calculate cost
        cost = quantity * inventory.costPerUnit;
        totalCharges += cost;

        // Update Inventory stock safely
        const previousStock = inventory.currentStock;
        const newStock = Math.max(0, previousStock - quantity);
        inventory.currentStock = newStock;
        await inventory.save();

        // ✅ FIX: Add required `quantity` field
        await InventoryTransaction.create({
          inventoryId: inventory._id,
          transactionType: updatedItem.status,
          quantity: quantity, // ✅ required field
          quantityChanged: -quantity, // optional, if you want to track difference
          previousStock,
          newStock,
          roomId: inspection.roomId,
          userId: inspectedBy || inspection.inspectedBy,
          notes: 'Updated via RoomInspection edit',
          cost
        });

        // Update RoomInventory status
        await RoomInventory.updateOne(
          {
            roomId: inspection.roomId,
            inventoryId: inventory._id
          },
          {
            $set: {
              status: updatedItem.status,
              remarks: updatedItem.remarks || '',
              userId: inspectedBy || inspection.inspectedBy
            }
          }
        );

        // Save costPerUnit to checklist (if not already saved)
        inspection.checklist[index].costPerUnit = inventory.costPerUnit;
      }
    }

    // Update totalCharges
    inspection.totalCharges = totalCharges;
    await inspection.save();

    // Update existing Invoice if found
    const invoice = await Invoice.findOne({
      serviceType: 'RoomInspection',
      serviceRefId: inspection._id
    });

    if (invoice) {
      invoice.items = inspection.checklist
        .filter(i => ['missing', 'damaged', 'used'].includes(i.status))
        .map(i => ({
          description: `${i.item} (${i.status})`,
          amount: i.quantity * (i.costPerUnit || 0)
        }));

      invoice.subTotal = totalCharges;
      invoice.totalAmount = totalCharges;
      invoice.tax = 0;
      invoice.discount = 0;
      await invoice.save();
    }

    return res.status(200).json({ message: 'RoomInspection updated', inspection });

  } catch (error) {
    console.error('Error updating RoomInspection:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 🔹 Helper
const generateInvoiceNumber = async () => {
  let invoiceNumber, exists = true;
  while (exists) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    invoiceNumber = `INV-${rand}`;
    exists = await Invoice.findOne({ invoiceNumber });
  }
  return invoiceNumber;
};

// Create a new housekeeping task
exports.createTask = async (req, res) => {
  try {
    const { roomId, bookingId, cleaningType, notes, priority, assignedTo } = req.body;
    
    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    // Validate bookingId
if (!bookingId) {
  return res.status(400).json({ error: 'bookingId is required' });
}
    const task = new Housekeeping({
      roomId,
      bookingId,
      cleaningType,
      notes,
      priority,
      assignedTo,
      status: 'pending'
    });
    
    await task.save();
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all housekeeping tasks
exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, cleaningType } = req.query;
    
    // Build filter based on query parameters
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (cleaningType) filter.cleaningType = cleaningType;
    if (req.query.bookingId) filter.bookingId = req.query.bookingId;

    const tasks = await Housekeeping.find(filter)
      .populate('roomId')
      .populate('assignedTo', 'username')
      .populate('verifiedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single housekeeping task by ID
exports.getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await Housekeeping.findById(taskId)
      .populate('roomId')
      .populate('assignedTo', 'username')
      .populate('bookingId')
      .populate('verifiedBy', 'username');
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get tasks assigned to specific staff
exports.getStaffTasks = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { bookingId } = req.query;
    const filter = { assignedTo: staffId };
    if (bookingId) filter.bookingId = bookingId;
    const tasks = await Housekeeping.find(filter)
  .populate('roomId')
  .sort({ priority: 1, createdAt: -1 });
    
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    
    const task = await Housekeeping.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is authorized to update this task
    const isAdmin = req.user.role === 'admin';
    const isStaff = req.user.role === 'staff';
    
    // Temporarily allow all staff to update tasks
    if (!isAdmin && !isStaff) {
      return res.status(403).json({ error: 'You are not authorized to update this task' });
    }
    
    // Only admin can verify tasks
    if (status === 'verified' && !isAdmin) {
      return res.status(403).json({ error: 'Only administrators can verify tasks' });
    }
    
    // Update status and timestamps based on new status
    task.status = status;
    if (notes) task.notes = notes;
    
    // Handle issues (previously called damageItems)
    if (req.body.issues && Array.isArray(req.body.issues)) {
      task.issues = req.body.issues.map(description => ({
        description,
        resolved: false
      }));
      task.markModified('issues');
    }
    if (req.body.beforeImages && req.body.beforeImages.length > 0) {
      if (!task.images) task.images = { before: [], after: [] };
      task.images.before = req.body.beforeImages.map(url => ({ url, uploadedAt: new Date() }));
      task.markModified('images');
    }
    if (req.body.afterImages && req.body.afterImages.length > 0) {
      if (!task.images) task.images = { before: [], after: [] };
      task.images.after = req.body.afterImages.map(url => ({ url, uploadedAt: new Date() }));
      task.markModified('images');
    }
    
    if (status === 'in-progress' && !task.startTime) {
      task.startTime = new Date();
    }
    
    if (status === 'cleaning' && !task.cleaningStartTime) {
      task.cleaningStartTime = new Date();
    }
    
    if (status === 'completed' && !task.endTime) {
      const endTime = new Date();
      task.endTime = endTime;
      
      // Calculate completion time in minutes
      if (task.startTime) {
        const startTime = new Date(task.startTime);
        const diffMs = endTime - startTime;
        task.completionTime = Math.round(diffMs / 60000); // Convert ms to minutes
      }
      
      // When task is completed, update the room status to available
      if (task.roomId) {
        const room = await Room.findById(task.roomId);
        if (room) {
          room.status = 'available';
          await room.save();
        }
      }
    }
    
    if (status === 'verified') {
      task.verifiedBy = req.user.id;
    }
    
    await task.save();
    
    // Force update issues if they were provided
    if (req.body.issues && Array.isArray(req.body.issues)) {
      const issuesData = req.body.issues.map(description => ({
        description,
        resolved: false
      }));
      await Housekeeping.findByIdAndUpdate(taskId, {
        $set: { issues: issuesData }
      });
    }
    
    // Fetch the updated task to return
    const updatedTask = await Housekeeping.findById(taskId)
      .populate('roomId')
      .populate('assignedTo', 'username')
      .populate('verifiedBy', 'username');
    
    res.json({ success: true, task: updatedTask });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Assign task to staff
exports.assignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { staffId } = req.body;
    
    const task = await Housekeeping.findByIdAndUpdate(
      taskId,
      { assignedTo: staffId },
      { new: true }
    );
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Report issue with room
exports.reportIssue = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { description } = req.body;
    
    const task = await Housekeeping.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    task.issues.push({ description, resolved: false });
    await task.save();
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Resolve reported issue
exports.resolveIssue = async (req, res) => {
  try {
    const { taskId, issueId } = req.params;
    
    const task = await Housekeeping.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const issue = task.issues.id(issueId);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    issue.resolved = true;
    await task.save();
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await Housekeeping.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get room cleaning history
exports.getRoomHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const history = await Housekeeping.find({ roomId })
      .populate('assignedTo', 'username')
      .populate('verifiedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get available housekeeping staff
exports.getAvailableStaff = async (req, res) => {
  try {
    // Find users with housekeeping department who aren't assigned to active tasks
    const busyStaffIds = await Housekeeping.find({
      status: { $in: ['pending', 'in-progress'] }
    }).distinct('assignedTo');
    
    const availableStaff = await User.find({
      _id: { $nin: busyStaffIds },
      'department.name': 'housekeeping',
      role: 'staff'
    }).select('_id username');
    
    res.json({ success: true, availableStaff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload before cleaning images
exports.uploadBeforeImages = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { imageUrls } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'Image URLs must be provided as an array' });
    }
    
    const task = await Housekeeping.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Initialize images object if it doesn't exist
    if (!task.images) {
      task.images = { before: [], after: [] };
    }
    
    // Add new images
    const newImages = imageUrls.map(url => ({
      url,
      uploadedAt: new Date()
    }));
    
    task.images.before.push(...newImages);
    await task.save();
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload after cleaning images
exports.uploadAfterImages = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { imageUrls } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'Image URLs must be provided as an array' });
    }
    
    const task = await Housekeeping.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Initialize images object if it doesn't exist
    if (!task.images) {
      task.images = { before: [], after: [] };
    }
    
    // Add new images
    const newImages = imageUrls.map(url => ({
      url,
      uploadedAt: new Date()
    }));
    
    task.images.after.push(...newImages);
    await task.save();
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};