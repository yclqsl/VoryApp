const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180
    },
    statusMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 90
    },
    favoritePlatforms: {
      type: [String],
      default: []
    },
    profileBadges: {
      type: [String],
      default: ["Closed Beta Tester"]
    },
    profileTheme: {
      type: String,
      enum: ["vory", "violet", "fuchsia", "emerald", "sky"],
      default: "vory"
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    friendRequestsSent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    friendRequestsReceived: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
