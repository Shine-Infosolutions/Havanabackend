const Invoice = require('../models/Invoice');

const Booking = require('../models/Booking');
const Reservation = require('../models/Reservation');
const CabBooking = require('../models/cabBooking');
const RestaurantOrder = require('../models/RestaurantOrder');
const Room = require('../models/Room'); 
const Housekeeping = require('../models/Housekeeping'); 
const RoomInspection = require('../models/RoomInspection');
const Laundry = require('../models/Laundry'); 

// 🧮 Generate unique invoice number
const generateInvoiceNumber = async () => {
  let invoiceNumber, exists = true;
  while (exists) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    invoiceNumber = `INV-${rand}`;
    exists = await Invoice.findOne({ invoiceNumber });
  }
  return invoiceNumber;
};

const serviceModels = {
  Booking,
  Reservation,
  CabBooking,
  RestaurantOrder,
  Room,
  //Housekeeping,
  RoomInspection,
  Laundry
};

exports.createInvoice = async (req, res) => {
  try {
    let { serviceType, serviceRefId, tax = 0, paymentMode } = req.body;
    let discount = req.body.discount || 0; // mutable discount

    if (!serviceType || !serviceRefId) {
      return res.status(400).json({ error: 'serviceType and serviceRefId are required' });
    }

    const model = serviceModels[serviceType];
    if (!model) {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    const serviceDoc = await model.findById(serviceRefId);
    if (!serviceDoc) {
      return res.status(404).json({ error: `${serviceType} not found` });
    }

    let items = [];
    let subTotal = 0;
    let bookingId = serviceType === 'Booking' ? serviceRefId : serviceDoc.bookingId || undefined;

    // ===== Booking Charges =====
    if (serviceType === 'Booking') {
      const { checkInDate, checkOutDate, rate = 0, discountPercent = 0, discountRoomSource = 0 } = serviceDoc;

      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const diffTime = Math.abs(checkOut - checkIn);
      const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      const roomCharge = numberOfNights * rate;

      // Calculate discounts
      const percentDiscount = discountPercent > 0 ? (roomCharge * (discountPercent / 100)) : 0;
      const flatDiscount = discountRoomSource || 0;
      const totalDiscount = percentDiscount + flatDiscount;

      // Add room charges
      items.push({
        description: `Room Charges (${numberOfNights} Night${numberOfNights > 1 ? 's' : ''})`,
        amount: roomCharge
      });

      // Show discounts as negative line items
      if (percentDiscount > 0) {
        items.push({
          description: `Discount (${discountPercent}%)`,
          amount: -percentDiscount
        });
      }
      if (flatDiscount > 0) {
        items.push({
          description: `Flat Discount`,
          amount: -flatDiscount
        });
      }

      subTotal = roomCharge;
      discount = totalDiscount; // ✅ now works because discount is mutable
    }

    // ===== Room Inspection Charges =====
    else if (serviceType === 'RoomInspection') {
      const inspectionItems = serviceDoc.checklist || [];

      // Map only damaged, missing, or used items
      items = inspectionItems
        .filter(i => i.status && ['missing', 'damaged', 'used'].includes(i.status.toLowerCase()))
        .map(i => {
          const quantity = i.quantity || 1;
          const costPerUnit = i.costPerUnit || 0;
          const amount = quantity * costPerUnit;
          return {
            description: `${i.item || i.itemName || i.name || 'Item'} (${i.status}) - Qty: ${quantity}`,
            amount: amount
          };
        });

      subTotal = items.reduce((sum, i) => sum + i.amount, 0);

      // fallback if subTotal still zero
      if (subTotal === 0 && serviceDoc.totalCharges) {
        items = [{
          description: `Room Inspection - ${serviceDoc.inspectionType}`,
          amount: serviceDoc.totalCharges
        }];
        subTotal = serviceDoc.totalCharges;
      }
    }

    // ===== Housekeeping Charges =====
    else if (serviceType === 'Housekeeping') {
      // Handle housekeeping-related charges (room inspection items)
      if (req.body.items && Array.isArray(req.body.items)) {
        items = req.body.items;
        subTotal = items.reduce((acc, item) => acc + item.amount, 0);
      } else {
        items = [{
          description: 'Housekeeping Service',
          amount: 0
        }];
        subTotal = 0;
      }
    }
// ===== Laundry Charges =====
else if (serviceType === 'Laundry') {
  const laundryItems = serviceDoc.items || [];

  items = laundryItems.map(item => {
    const qty = item.quantity || 1;
    const amt = item.calculatedAmount || 0;
    return {
      description: `Laundry - ${item.itemNotes || 'No notes'} (Qty: ${qty})`,
      amount: amt
    };
  });

  subTotal = serviceDoc.totalAmount || items.reduce((sum, i) => sum + i.amount, 0);

  // If laundry is linked to a booking, attach bookingId
  bookingId = serviceDoc.bookingId || bookingId;
}

    // ===== Other Services =====
    else if (req.body.items && Array.isArray(req.body.items)) {
      items = req.body.items;
      subTotal = items.reduce((acc, item) => acc + item.amount, 0);
    } else {
      return res.status(400).json({ error: 'Items are required for this service type' });
    }

    // ===== Final Amounts =====
    const totalAmount = subTotal + tax - discount;
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = new Invoice({
      serviceType,
      serviceRefId,
      invoiceNumber,
      items,
      subTotal,
      tax,
      discount,
      totalAmount,
      paymentMode,
      status: 'Unpaid',
      paidAmount: 0,
      balanceAmount: totalAmount,
      bookingId
    });

    await invoice.save();

    // 🔄 Link invoice to booking if needed
    if (serviceType === 'Booking') {
      await Booking.findByIdAndUpdate(bookingId, { invoiceId: invoice._id });
    }

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get All Invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('serviceRefId');
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ GET Final Invoice by Booking ID
exports.getFinalInvoiceByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Get booking details
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get all invoices for this booking
    const existingInvoices = await Invoice.find({ bookingId }).populate('serviceRefId');

    // Calculate room charges
    const { checkInDate, checkOutDate, rate = 0, discountPercent = 0, discountRoomSource = 0 } = booking;
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = Math.abs(checkOut - checkIn);
    const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const roomCharge = numberOfNights * rate;
    const percentDiscount = discountPercent > 0 ? (roomCharge * (discountPercent / 100)) : 0;
    const flatDiscount = discountRoomSource || 0;
    const totalDiscount = percentDiscount + flatDiscount;

    // Start with room charges
    let consolidatedItems = [{
      description: `Room Charges (${numberOfNights} Night${numberOfNights > 1 ? 's' : ''})`,
      amount: roomCharge
    }];

    // Add discounts
    if (percentDiscount > 0) {
      consolidatedItems.push({
        description: `Discount (${discountPercent}%)`,
        amount: -percentDiscount
      });
    }
    if (flatDiscount > 0) {
      consolidatedItems.push({
        description: `Flat Discount`,
        amount: -flatDiscount
      });
    }

    // Add additional charges from other invoices
    let additionalCharges = 0;
    existingInvoices.forEach(invoice => {
      if (invoice.serviceType !== 'Booking') {
        invoice.items.forEach(item => {
          consolidatedItems.push(item);
          additionalCharges += item.amount;
        });
      }
    });

    const subTotal = roomCharge + additionalCharges;
    const finalTotal = subTotal - totalDiscount;

    // Create or update consolidated invoice
    const invoiceNumber = await generateInvoiceNumber();
    const consolidatedInvoice = {
      serviceType: 'Booking',
      serviceRefId: bookingId,
      invoiceNumber,
      items: consolidatedItems,
      subTotal,
      tax: 0,
      discount: totalDiscount,
      totalAmount: finalTotal,
      status: 'Unpaid',
      paidAmount: 0,
      balanceAmount: finalTotal,
      bookingId
    };

    return res.status(200).json({
      success: true,
      totalInvoiceCount: 1,
      grandTotal: finalTotal,
      invoices: [consolidatedInvoice]
    });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong', message: error.message });
  }
};

// Process payment for invoice
exports.processPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentMode } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const newPaidAmount = invoice.paidAmount + amount;
    const newBalanceAmount = invoice.totalAmount - newPaidAmount;

    if (newPaidAmount > invoice.totalAmount) {
      return res.status(400).json({ error: 'Payment amount exceeds invoice total' });
    }

    invoice.paidAmount = newPaidAmount;
    invoice.balanceAmount = newBalanceAmount;
    invoice.paymentMode = paymentMode;
    
    if (newBalanceAmount === 0) {
      invoice.status = 'Paid';
    } else if (newPaidAmount > 0) {
      invoice.status = 'Partial';
    }

    await invoice.save();

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
