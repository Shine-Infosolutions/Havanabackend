const Invoice = require('../models/Invoice');
const { getAuditLogModel } = require('../models/AuditLogModel');

// Helper function to create audit log
const createAuditLog = (action, recordId, userId, userRole, oldData, newData, req) => {
  setImmediate(async () => {
    try {
      const AuditLog = await getAuditLogModel();
      await AuditLog.create({
        action,
        module: 'INVOICE',
        recordId,
        userId: userId || 'SYSTEM',
        userRole: userRole || 'SYSTEM',
        oldData,
        newData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      });
    } catch (error) {
      console.error('❌ Audit log creation failed:', error);
    }
  });
};

// Create invoice
exports.createInvoice = async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();

    // Create audit log
    await createAuditLog('CREATE', invoice._id, req.user?.id, req.user?.role, null, invoice.toObject(), req);

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const originalInvoice = await Invoice.findById(req.params.id);
    if (!originalInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Create audit log
    await createAuditLog('UPDATE', invoice._id, req.user?.id, req.user?.role, originalInvoice.toObject(), invoice.toObject(), req);

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create audit log
    await createAuditLog('DELETE', invoice._id, req.user?.id, req.user?.role, invoice.toObject(), null, req);

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Preview next invoice number without incrementing counter
exports.getNextInvoiceNumber = async (req, res) => {
  try {
    const { bookingId } = req.query;
    
    // Check if this booking already has an invoice
    if (bookingId) {
      const existingInvoice = await Invoice.findOne({ bookingId });
      if (existingInvoice) {
        return res.json({ success: true, message: 'Invoice already exists for this booking' });
      }
    }
    
    res.json({ success: true, message: 'Invoice can be created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};