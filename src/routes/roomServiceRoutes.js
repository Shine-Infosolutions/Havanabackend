const express = require("express");
const router = express.Router();
const roomServiceController = require("../controllers/roomServiceController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Create new room service order
router.post("/order", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.createOrder);

// Get all orders with filters
router.get("/orders", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.getAllOrders);

// Get order by ID
router.get("/order/:id", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.getOrderById);

// Update order status
router.patch("/order/:id/status", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.updateOrderStatus);

// Generate KOT
router.post("/order/:id/kot", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.generateKOT);

// Generate Bill
router.post("/order/:id/bill", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.generateBill);

// Bill lookup
router.get("/bill-lookup", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.billLookup);

// Get room service charges for checkout
router.get("/room-charges", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.getRoomServiceCharges);

// Mark room service orders as paid
router.post("/mark-paid", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.markOrdersPaid);

// Update payment status
router.patch("/order/:id/payment", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.updatePaymentStatus);

// Delete order
router.delete("/order/:id", authMiddleware(["admin", "staff"], ["reception"]), roomServiceController.deleteOrder);

module.exports = router;