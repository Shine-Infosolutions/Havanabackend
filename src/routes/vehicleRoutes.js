const express = require("express");
const router = express.Router();
const controller = require("../controllers/vehicleController");

router.post("/add", controller.addVehicle);
router.get("/all", controller.getAllVehicles);
router.get("/get/:id", controller.getVehicleById);
router.put("/update/:id", controller.updateVehicle);
router.get("/number/:number", controller.getVehicleByNumber);
router.delete("/delete/:id", controller.deleteVehicle);

module.exports = router;
