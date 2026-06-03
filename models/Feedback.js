const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["bug", "idea", "general"],
      default: "bug",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
      index: true,
    },
    roomCode: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    username: {
      type: String,
      default: "Anonim",
      trim: true,
    },
    userId: {
      type: String,
      default: "",
      index: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    appVersion: {
      type: String,
      default: "beta",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["open", "reviewing", "closed"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
