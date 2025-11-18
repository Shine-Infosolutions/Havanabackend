const Checkout = require('../models/Checkout');
const Booking = require('../models/Booking');
const RestaurantOrder = require('../models/RestaurantOrder');
const Laundry = require('../models/Laundry');
const RoomInspection = require('../models/RoomInspection');
const mongoose = require('mongoose');

// Create checkout record
exports.createCheckout = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Get all service charges for this booking
    const [restaurantOrders, laundryServices, inspections] = await Promise.all([
      RestaurantOrder.find({ bookingId }).populate('items.itemId'),
      Laundry.find({ bookingId }).populate('items.rateId'),
      RoomInspection.find({ bookingId })
    ]);

    // Get booking details for room charges
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Calculate restaurantCharges correctly as sum of item amounts
    let restaurantCharges = 0;
    const restaurantItems = restaurantOrders.map(order => {
      const items = order.items.map(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.itemId?.Price) || Number(item.price) || 0;
        const amount = price * quantity;

        restaurantCharges += amount; // accumulate total

        return {
          itemId: item.itemId?._id,
          itemName: item.itemId?.name || item.itemName,
          quantity,
          price,
          rate: price,
          amount
        };
      });

      return {
        orderId: order._id,
        items,
        orderAmount: items.reduce((sum, i) => sum + i.amount, 0),
        orderDate: order.createdAt
      };
    });

    // Calculate laundryCharges correctly
    let laundryCharges = 0;
    const laundryItems = laundryServices.map(service => {
      const items = service.items.map(item => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rateId?.rate) || 0;
        const amount = Number(item.calculatedAmount) || rate * quantity || 0;
    
        laundryCharges += amount;
    
        return {
          itemName: item.itemName,
          quantity,
          rate,
          amount
        };
      });
    
      return {
        laundryId: service._id,
        items,
        serviceAmount: items.reduce((sum, i) => sum + i.amount, 0),
        serviceDate: service.createdAt
      };
    });    

    // Prepare inspection items
    let inspectionCharges = 0;
    const inspectionItems = inspections.map(inspection => {
      let items = [];

      if (inspection.checklist?.length > 0) {
        const damagedItems = inspection.checklist.filter(item =>
          item.status !== 'ok' && ['missing', 'damaged', 'used'].includes(item.status)
        );

        if (damagedItems.length > 0) {
          const chargePerItem = (Number(inspection.totalCharges) || 0) / damagedItems.length;
          items = damagedItems.map(item => {
            const quantity = Number(item.quantity) || 1;
            const costPerUnit = Number(item.costPerUnit) || chargePerItem;
            const amount = costPerUnit * quantity;

            inspectionCharges += amount;

            return {
              itemName: item.item,
              quantity,
              status: item.status,
              costPerUnit,
              amount
            };
          });
        }
      }

      // If no damaged items but charges exist, create sample items
      if (items.length === 0 && Number(inspection.totalCharges) > 0) {
        const sampleDamagedItems = [
          { item: 'Towel', quantity: 1, status: 'missing' },
          { item: 'Bedsheet', quantity: 1, status: 'damaged' }
        ];
        const chargePerItem = (Number(inspection.totalCharges) || 0) / sampleDamagedItems.length;
        items = sampleDamagedItems.map(item => {
          const amount = chargePerItem;
          inspectionCharges += amount;

          return {
            itemName: item.item,
            quantity: Number(item.quantity) || 1,
            status: item.status,
            costPerUnit: chargePerItem,
            amount
          };
        });
      }

      // Convert items to invoice format
      const invoiceItems = items.map(item => ({
        description: `${item.itemName} (${item.status})`,
        amount: Number(item.amount) || 0,
        _id: new mongoose.Types.ObjectId()
      }));

      return {
        inspectionId: inspection._id,
        charges: Number(inspection.totalCharges) || 0,
        inspectionDate: inspection.createdAt,
        remarks: inspection.remarks,
        items: invoiceItems
      };
    });

    // Room booking charges
    const bookingCharges = Number(booking.rate) || 0;

    const totalAmount = restaurantCharges + laundryCharges + inspectionCharges + bookingCharges;

    const checkout = await Checkout.create({
      bookingId,
      restaurantCharges,
      laundryCharges,
      inspectionCharges,
      bookingCharges,
      totalAmount,
      serviceItems: {
        restaurant: restaurantItems,
        laundry: laundryItems,
        inspection: inspectionItems
      },
      pendingAmount: totalAmount
    });

    res.status(201).json({ success: true, checkout });
  } catch (error) {
    console.error('CreateCheckout Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Get checkout by booking ID
exports.getCheckout = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const checkout = await Checkout.findOne({ bookingId })
      .populate('bookingId', 'grcNo name roomNumber checkInDate checkOutDate');
    
    if (!checkout) {
      return res.status(404).json({ message: 'Checkout not found' });
    }

    res.status(200).json({ success: true, checkout });
  } catch (error) {
    console.error('GetCheckout Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paidAmount } = req.body;

    const checkout = await Checkout.findById(id);
    if (!checkout) {
      return res.status(404).json({ message: 'Checkout not found' });
    }

    checkout.status = status;
    if (paidAmount !== undefined) {
      checkout.pendingAmount = Math.max(0, checkout.totalAmount - paidAmount);
    }

    await checkout.save();
    res.status(200).json({ success: true, checkout });
  } catch (error) {
    console.error('UpdatePayment Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get invoice by checkout ID
exports.getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkout = await Checkout.findById(id)
      .populate({
        path: 'bookingId',
        select: 'grcNo name roomNumber checkInDate checkOutDate mobileNo address city rate',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      });
    
    if (!checkout) {
      return res.status(404).json({ message: 'Checkout not found' });
    }

    const booking = checkout.bookingId;
    const currentDate = new Date();
    const billNo = `P${Date.now().toString().slice(-10)}`;
    
    const taxableAmount = checkout.bookingCharges / 1.12;
    const cgstAmount = taxableAmount * 0.06;
    const sgstAmount = taxableAmount * 0.06;
    
    const invoice = {
      invoiceDetails: {
        billNo: billNo,
        billDate: currentDate.toLocaleDateString('en-GB'),
        grcNo: booking?.grcNo || 'N/A',
        roomNo: booking?.roomNumber || 'N/A',
        roomType: booking?.categoryId?.name || 'DELUXE ROOM',
        pax: 2,
        adult: 2,
        checkInDate: booking?.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-GB') : 'N/A',
        checkOutDate: booking?.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString('en-GB') : 'N/A'
      },
      clientDetails: {
        name: booking?.name || 'N/A',
        address: booking?.address || 'GORAKHPUR, UP-273001',
        city: booking?.city || 'GORAKHPUR',
        company: ':',
        gstin: '09COJPP9995B1Z3',
        mobileNo: booking?.mobileNo || 'N/A',
        nationality: 'Indian'
      },
      items: [
        {
          date: booking?.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-GB') : currentDate.toLocaleDateString('en-GB'),
          particulars: `Room Rent ${booking?.categoryId?.name || 'DELUXE ROOM'} (Room: ${booking?.roomNumber || 'N/A'})`,
          pax: 2,
          declaredRate: checkout.bookingCharges,
          hsn: 996311,
          rate: 6,
          cgstRate: cgstAmount,
          sgstRate: sgstAmount,
          amount: checkout.bookingCharges
        }
      ],
      taxes: [
        {
          taxRate: 6,
          taxableAmount: taxableAmount,
          cgst: cgstAmount,
          sgst: sgstAmount,
          amount: checkout.bookingCharges
        }
      ],
      payment: {
        taxableAmount: taxableAmount,
        cgst: cgstAmount,
        sgst: sgstAmount,
        total: checkout.totalAmount
      },
      otherCharges: []
    };

    if (checkout.restaurantCharges > 0) {
      invoice.otherCharges.push({
        particulars: 'IN ROOM DINING',
        amount: checkout.restaurantCharges
      });
    }

    if (checkout.laundryCharges > 0) {
      invoice.otherCharges.push({
        particulars: 'LAUNDRY',
        amount: checkout.laundryCharges
      });
    }

    if (checkout.inspectionCharges > 0) {
      invoice.otherCharges.push({
        particulars: 'ROOM INSPECTION CHARGES',
        amount: checkout.inspectionCharges
      });
    }

    res.status(200).json({ success: true, invoice });
  } catch (error) {
    console.error('GetInvoice Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};