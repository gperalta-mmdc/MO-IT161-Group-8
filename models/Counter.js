const mongoose = require("mongoose");

/* use to hand out sequential IDs (DR-1001, DR-1002, ...) */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "delivery"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
