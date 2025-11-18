const RestaurantReservation = require("../models/RestaurantReservation");

const generateReservationNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await RestaurantReservation.countDocuments({
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
    },
  });
  return `RES${dateStr}${String(count + 1).padStart(3, "0")}`;
};

exports.createReservation = async (req, res) => {
  try {
    const {
      guestName,
      phoneNumber,
      email,
      partySize,
      reservationDate,
      reservationTimeIn,
      reservationTimeOut,
      specialRequests,
      advancePayment
    } = req.body;
    const reservationNumber = await generateReservationNumber();

    const status = (advancePayment && advancePayment > 0) ? 'reserved' : 'enquiry';
    
    const reservation = new RestaurantReservation({
      reservationNumber,
      guestName,
      phoneNumber,
      email,
      partySize,
      reservationDate,
      reservationTimeIn,  
      reservationTimeOut,
      specialRequests,
      advancePayment: advancePayment || 0,
      status,
      createdBy: req.user?.id || req.user?._id,
    });

    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllReservations = async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.reservationDate = {
        $gte: startDate,
        $lt: endDate,
      };
    }
    const reservations = await RestaurantReservation.find(filter)
      .populate("createdBy", "username")
      .sort({ reservationDate: 1, reservationTime: 1 });
    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getReservationById = async (req, res) => {
  try {
    const reservation = await RestaurantReservation.findById(req.params.id)
      .populate('createdBy', 'username');
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateReservation = async (req, res) => {
  try {
    const reservation = await RestaurantReservation.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateReservationStatus = async (req, res) => {
  try {
    const { status, tableNo } = req.body;
    const updates = { status };
    if (tableNo) updates.tableNo = tableNo;
    
    const reservation = await RestaurantReservation.findByIdAndUpdate(
      req.params.id, updates, { new: true }
    );
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { advancePayment } = req.body;
    const status = (advancePayment && advancePayment > 0) ? 'reserved' : 'enquiry';
    
    const reservation = await RestaurantReservation.findByIdAndUpdate(
      req.params.id,
      { advancePayment, status },
      { new: true }
    );
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await RestaurantReservation.findByIdAndDelete(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
