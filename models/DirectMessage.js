const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      default: "",
      index: true,
    },
    fromUserId: {
      type: String,
      required: true,
      index: true,
    },
    toUserId: {
      type: String,
      required: true,
      index: true,
    },
    fromUsername: {
      type: String,
      default: "Kullanıcı",
      trim: true,
    },
    toUsername: {
      type: String,
      default: "Kullanıcı",
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

directMessageSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });
directMessageSchema.index({ toUserId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
