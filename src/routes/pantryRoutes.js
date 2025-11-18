const express = require("express");
const router = express.Router();
const pantryController = require("../controllers/pantryController");
const unitMasterController = require("../controllers/unitMasterController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Unit Master Routes for Pantry
router.get(
  "/units",
  authMiddleware(["admin", "staff", "pantry"]),
  unitMasterController.getUnits
);

// Pantry Items Routes
router.get(
  "/items",
  pantryController.getAllPantryItems
);

router.get(
  "/items/low-stock",
  authMiddleware(["admin", "staff", "pantry"], ["pantry", "reception"]),
  pantryController.getLowStockPantryItems
);

router.post(
  "/items",
  pantryController.createPantryItem
);

router.put(
  "/items/:id",
  authMiddleware(["admin", "staff", "pantry"], ["pantry"]),
  pantryController.updatePantryItem
);

router.delete(
  "/items/:id",
  authMiddleware(["admin"]),
  pantryController.deletePantryItem
);

router.patch(
  "/items/:id/stock",
  authMiddleware(["admin", "staff", "pantry"], ["pantry"]),
  pantryController.updatePantryStock
);

router.get(
  "/invoice/low-stock",
  authMiddleware(["admin", "staff"], ["pantry"]),
  pantryController.generateLowStockInvoice
);

router.get(
  "/invoices/vendor",
  authMiddleware(["admin", "staff"], ["pantry"]),
  pantryController.generateVendorInvoice
);

// Pantry Orders Routes
router.get(
  "/orders",
  authMiddleware(["admin", "staff", "pantry"]),
  pantryController.getPantryOrders
);

router.get(
  "/orders/:id",
  authMiddleware(["admin", "staff", "pantry"]),
  pantryController.getPantryOrderById
);

router.post(
  "/orders",
  authMiddleware(["admin", "staff", "pantry"], ["kitchen", "pantry"]),
  pantryController.createPantryOrder
);

router.put(
  "/orders/:id",
  authMiddleware(["admin", "staff", "pantry"]),
  pantryController.updatePantryOrder
);

router.patch(
  "/orders/:id/status",
  authMiddleware(["admin", "staff", "pantry"]),
  pantryController.updatePantryOrderStatus
);

router.patch(
  "/orders/:orderId/payment-status",
  authMiddleware(["admin", "staff", "pantry"]),
  pantryController.updatePaymentStatus
);

router.delete(
  "/orders/:id",
  authMiddleware(["admin"]),
  pantryController.deletePantryOrder
);

// Fulfillment Routes
router.post(
  "/upload-pricing-image",
  authMiddleware(["admin", "staff"], ["pantry", "reception"]),
  pantryController.uploadPricingImage
);

router.post(
  "/upload-chalan",
  authMiddleware(["admin", "staff"], ["pantry", "reception"]),
  pantryController.uploadChalan
);

router.post(
  "/disburse-to-kitchen",
  pantryController.disburseToKitchen
);

router.get(
  "/disbursement-history",
  authMiddleware(["admin", "staff"], ["pantry"]),
  pantryController.getDisbursementHistory
);

router.put(
  "/fulfill-invoice/:orderId",
  authMiddleware(["admin", "staff"], ["pantry", "reception"]),
  pantryController.fulfillInvoice
);

router.get(
  "/fulfillment-history/:orderId",
  authMiddleware(["admin", "staff"], ["pantry", "reception"]),
  pantryController.getFulfillmentHistory
);

router.get(
  "/orders/excel-report",
  authMiddleware(["admin", "staff"], ["pantry", "reception"]),
  pantryController.generatePantryOrdersExcel
);

router.get(
  "/vendor-analytics/:vendorId",
  authMiddleware(["admin", "staff", "pantry"]),
  pantryController.getVendorAnalytics
);

router.get(
  "/suggested-vendors",
  authMiddleware(["admin", "staff", "pantry"]),
  pantryController.getSuggestedVendors
);

router.get(
  "/items/excel-report",
  authMiddleware(["admin", "staff"], ["pantry", "reception"]),
  pantryController.generatePantryItemsExcel
);

module.exports = router;
