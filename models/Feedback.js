const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["bug", "idea", "general"],
      default: "bug",
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
    roomCode: {
      type: String,
      default: "",
      trim: true,
    },
    username: {
      type: String,
      default: "Anonim",
      trim: true,
    },
    userId: {
      type: String,
      default: "",
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
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
