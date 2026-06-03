const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function normalizeId(id) {
  return String(id || "");
}

function publicUser(user) {
  if (!user) return null;

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || "",
  };
}

async function getHydratedFriendState(userId) {
  const user = await User.findById(userId)
    .populate("friends", "username email avatar")
    .populate("friendRequestsSent", "username email avatar")
    .populate("friendRequestsReceived", "username email avatar");

  if (!user) return null;

  return {
    user: publicUser(user),
    friends: (user.friends || []).map(publicUser),
    sent: (user.friendRequestsSent || []).map(publicUser),
    received: (user.friendRequestsReceived || []).map(publicUser),
  };
}

router.get("/state/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidId(userId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı." });
    }

    const state = await getHydratedFriendState(userId);

    if (!state) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.json(state);
  } catch (error) {
    console.error("Friend state alınamadı:", error);
    res.status(500).json({ message: "Friend state alınamadı." });
  }
});

router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const currentUserId = String(req.query.currentUserId || "");

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const filters = [
      { username: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ];

    const users = await User.find({
      $or: filters,
      ...(isValidId(currentUserId) ? { _id: { $ne: currentUserId } } : {}),
    })
      .select("username email avatar")
      .limit(20)
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("Kullanıcı arama hatası:", error);
    res.status(500).json({ message: "Kullanıcı aranamadı." });
  }
});

router.post("/request", async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body || {};

    if (!isValidId(fromUserId) || !isValidId(toUserId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı." });
    }

    if (normalizeId(fromUserId) === normalizeId(toUserId)) {
      return res.status(400).json({ message: "Kendine arkadaşlık isteği gönderemezsin." });
    }

    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(toUserId),
    ]);

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const alreadyFriends = (fromUser.friends || []).some((id) => normalizeId(id) === normalizeId(toUserId));

    if (alreadyFriends) {
      return res.status(409).json({ message: "Zaten arkadaşsınız." });
    }

    const reversePending = (fromUser.friendRequestsReceived || []).some((id) => normalizeId(id) === normalizeId(toUserId));

    if (reversePending) {
      fromUser.friendRequestsReceived = fromUser.friendRequestsReceived.filter((id) => normalizeId(id) !== normalizeId(toUserId));
      toUser.friendRequestsSent = toUser.friendRequestsSent.filter((id) => normalizeId(id) !== normalizeId(fromUserId));
      fromUser.friends.addToSet(toUser._id);
      toUser.friends.addToSet(fromUser._id);
      await Promise.all([fromUser.save(), toUser.save()]);

      return res.json({
        message: "Karşılıklı istek otomatik kabul edildi.",
        state: await getHydratedFriendState(fromUserId),
      });
    }

    fromUser.friendRequestsSent.addToSet(toUser._id);
    toUser.friendRequestsReceived.addToSet(fromUser._id);

    await Promise.all([fromUser.save(), toUser.save()]);

    res.status(201).json({
      message: "Arkadaşlık isteği gönderildi.",
      state: await getHydratedFriendState(fromUserId),
    });
  } catch (error) {
    console.error("Arkadaşlık isteği gönderilemedi:", error);
    res.status(500).json({ message: "Arkadaşlık isteği gönderilemedi." });
  }
});

router.post("/accept", async (req, res) => {
  try {
    const { currentUserId, requesterId } = req.body || {};

    if (!isValidId(currentUserId) || !isValidId(requesterId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı." });
    }

    const [currentUser, requester] = await Promise.all([
      User.findById(currentUserId),
      User.findById(requesterId),
    ]);

    if (!currentUser || !requester) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    currentUser.friendRequestsReceived = currentUser.friendRequestsReceived.filter((id) => normalizeId(id) !== normalizeId(requesterId));
    requester.friendRequestsSent = requester.friendRequestsSent.filter((id) => normalizeId(id) !== normalizeId(currentUserId));
    currentUser.friends.addToSet(requester._id);
    requester.friends.addToSet(currentUser._id);

    await Promise.all([currentUser.save(), requester.save()]);

    res.json({
      message: "Arkadaşlık isteği kabul edildi.",
      state: await getHydratedFriendState(currentUserId),
    });
  } catch (error) {
    console.error("Arkadaşlık isteği kabul edilemedi:", error);
    res.status(500).json({ message: "Arkadaşlık isteği kabul edilemedi." });
  }
});

router.post("/reject", async (req, res) => {
  try {
    const { currentUserId, requesterId } = req.body || {};

    if (!isValidId(currentUserId) || !isValidId(requesterId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı." });
    }

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $pull: { friendRequestsReceived: requesterId } }),
      User.findByIdAndUpdate(requesterId, { $pull: { friendRequestsSent: currentUserId } }),
    ]);

    res.json({
      message: "Arkadaşlık isteği reddedildi.",
      state: await getHydratedFriendState(currentUserId),
    });
  } catch (error) {
    console.error("Arkadaşlık isteği reddedilemedi:", error);
    res.status(500).json({ message: "Arkadaşlık isteği reddedilemedi." });
  }
});

router.delete("/:currentUserId/:friendId", async (req, res) => {
  try {
    const { currentUserId, friendId } = req.params;

    if (!isValidId(currentUserId) || !isValidId(friendId)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı." });
    }

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: currentUserId } }),
    ]);

    res.json({
      message: "Arkadaş silindi.",
      state: await getHydratedFriendState(currentUserId),
    });
  } catch (error) {
    console.error("Arkadaş silinemedi:", error);
    res.status(500).json({ message: "Arkadaş silinemedi." });
  }
});

module.exports = router;
