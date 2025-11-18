const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');

// Helper to generate unique payment number
const generatePaymentNumber = async () => {
  let paymentNumber, exists = true;
  while (exists) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    paymentNumber = `PAY-${rand}`;
    exists = await Payment.findOne({ paymentNumber });
  }
  return paymentNumber;
};

// Create Payment
exports.createPayment = async (req, res) => {
  try {
    const {
      amount,
      paymentMode,
      paymentType,      // 'Advance' / 'Final'
      status,           // 'Paid' / 'Pending' / 'Failed'
      invoiceId,
      sourceType,
      sourceId,
      remarks,
      collectedBy
    } = req.body;

    // Validate
    if (!amount || !paymentMode || !paymentType || !sourceType || !sourceId) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Optionally check if invoice exists
    if (invoiceId) {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    }

    const paymentNumber = await generatePaymentNumber();

    const payment = new Payment({
      amount,
      paymentMode,
      isAdvance: paymentType.toLowerCase() === 'advance',
      status: status || 'Paid',
      invoiceId: invoiceId || null,
      sourceType,
      sourceId,
      remarks,
      paymentNumber,
      collectedBy
    });

    await payment.save();
// After payment.save()
const invoice = await Invoice.findById(payment.invoiceId);
if (!invoice) throw new Error("Invoice not found");

// Add this payment to the paid amount
invoice.paidAmount = (invoice.paidAmount || 0) + payment.amount;

// Update status based on total vs paid
if (invoice.paidAmount >= invoice.totalAmount) {
  invoice.status = "Paid";
} else if (invoice.paidAmount > 0) {
  invoice.status = "Partial";
} else {
  invoice.status = "Unpaid";
}

invoice.paymentMode = payment.paymentMode;
invoice.paidAt = payment.receivedAt;

await invoice.save();

    res.status(201).json({ message: 'Payment recorded successfully', data: payment });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all payments (with optional filters)
exports.getAllPayments = async (req, res) => {
  try {
    const { sourceType, sourceId } = req.query;

    let filter = {};
    if (sourceType) filter.sourceType = sourceType;
    if (sourceId) filter.sourceId = sourceId;

    const payments = await Payment.find(filter)
      .populate('invoiceId')
      .populate('sourceId');

    res.status(200).json({ data: payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get payments by service
exports.getPaymentsByService = async (req, res) => {
  try {
    const { sourceType, sourceId } = req.params;
    const payments = await Payment.find({ sourceType, sourceId });
    res.status(200).json({ data: payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Total payment summary by service
exports.getTotalPaidAmount = async (req, res) => {
  try {
    const { sourceType, sourceId } = req.params;
    const payments = await Payment.aggregate([
      {
        $match: {
          sourceType,
          sourceId: new mongoose.Types.ObjectId(sourceId),
          status: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" }
        }
      }
    ]);
    res.status(200).json({
      totalPaid: payments[0]?.totalPaid || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
