const mongoose = require("mongoose");

const banquetcategorySchema = new mongoose.Schema(
  {
    cateName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BanquetCategory", banquetcategorySchema);
