const mongoose = require("mongoose");

const peakHourSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // "HH:mm"
    end: { type: String, required: true }, // "HH:mm"
  },
  { _id: false }
);

const surgeSettingSchema = new mongoose.Schema(
  {
    region: {
      type: String,
      required: true,
      trim: true,
    },
    baseDeliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 30,
    },
    // Applied during peakHours windows (e.g. lunch/dinner)
    surgeMultiplier: {
      type: Number,
      required: true,
      min: 1,
      default: 1.5,
    },
    // If active order volume >= demandThreshold, multiplier becomes 2x
    demandThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 25,
    },
    peakHours: {
      type: [peakHourSchema],
      default: [],
    },
  },
  { timestamps: true }
);

surgeSettingSchema.index({ region: 1 }, { unique: true });

module.exports = mongoose.model("SurgeSetting", surgeSettingSchema);

