const express = require("express");
const {
  issueRoomKey,
  useRoomKey,
  deactivateRoomKey,
  getActiveKeys,
  getKeyUsage,
} = require("../controllers/roomKeyController");

const router = express.Router();

router.post("/issue", issueRoomKey);            // check-in → key issue
router.post("/use", useRoomKey);                // guest taps card
router.post("/deactivate", deactivateRoomKey);  // checkout/lost card
router.get("/active", getActiveKeys);           // staff view active keys
router.get("/usage/:rfidUID", getKeyUsage);     // staff check usage count

module.exports = router;
