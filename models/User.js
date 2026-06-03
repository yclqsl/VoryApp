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
    profileXp: {
      type: Number,
      default: 0
    },
    profileLevel: {
      type: Number,
      default: 1
    },
    profileFrame: {
      type: String,
      enum: ["rookie", "neon", "galaxy", "cinema", "founder"],
      default: "rookie"
    },
    profileStats: {
      roomsJoined: { type: Number, default: 0 },
      watchSeconds: { type: Number, default: 0 },
      mediaPlayed: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 },
      reactionsUsed: { type: Number, default: 0 },
      invitesSent: { type: Number, default: 0 },
      friends: { type: Number, default: 0 }
    },
    achievements: [
      {
        id: { type: String, required: true },
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        icon: { type: String, default: "🏆" },
        xpReward: { type: Number, default: 0 },
        unlockedAt: { type: Date, default: Date.now }
      }
    ],
    dailyMissions: {
      dateKey: { type: String, default: "" },
      claimedMissionIds: { type: [String], default: [] },
      completedMissionIds: { type: [String], default: [] },
      totalXpClaimed: { type: Number, default: 0 },
      updatedAt: { type: Date, default: null }
    },

    profileInventory: {
      unlockedItemIds: { type: [String], default: [] },
      purchasedItemIds: { type: [String], default: [] },
      equippedItemIds: { type: [String], default: [] },
      totalSpentXp: { type: Number, default: 0 },
      updatedAt: { type: Date, default: null }
    },
    activeCustomizations: {
      frame: { type: String, default: "rookie" },
      theme: { type: String, default: "vory" },
      glow: { type: String, default: "none" },
      badgeShowcase: { type: [String], default: [] }
    },
    lastProfileSyncAt: {
      type: Date,
      default: null
    },
    profileTheme: {
      type: String,
      enum: ["vory", "violet", "fuchsia", "emerald", "sky", "cinema", "galaxy", "gaming"],
      default: "vory"
    },

    creatorProfile: {
      enabled: { type: Boolean, default: false },
      displayName: { type: String, default: "", trim: true, maxlength: 60 },
      headline: { type: String, default: "", trim: true, maxlength: 120 },
      category: { type: String, default: "Watch Party", trim: true, maxlength: 40 },
      creatorBadges: { type: [String], default: [] },
      featured: { type: Boolean, default: false },
      totalRoomsHosted: { type: Number, default: 0 },
      totalWatchHours: { type: Number, default: 0 },
      lastLiveAt: { type: Date, default: null }
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    creatorEvents: [
      {
        id: { type: String, default: "" },
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        icon: { type: String, default: "📅" },
        startsAt: { type: Date, default: null },
        roomCode: { type: String, default: "" },
        reminderUserIds: { type: [String], default: [] },
        createdAt: { type: Date, default: Date.now }
      }
    ],
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
