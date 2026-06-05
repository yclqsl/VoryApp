const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const ADMIN_EMAIL_FIX_TARGET = "yucelinizbusiness@gmail.com";

function getAdminFixKey(req) {
  return req.headers["x-admin-key"] || req.body?.adminKey || req.query?.key || "";
}

function normalizeLoginValue(value = "") {
  return String(value || "").trim();
}

const USERNAME_REGEX = /^[a-z0-9.]{3,20}$/i;

function normalizeUsername(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isValidUsername(value = "") {
  const cleanUsername = normalizeUsername(value);
  return USERNAME_REGEX.test(cleanUsername);
}

function isValidEmail(value = "") {
  const cleanEmail = String(value || "").trim().toLowerCase();
  return cleanEmail.includes("@") && cleanEmail.includes(".");
}


function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}


// Vory 1.0.5.3 - One-time admin email repair endpoint.
// Deploy this, call it once with ADMIN_KEY, then remove this endpoint in a later cleanup patch.
router.patch("/admin/fix-email", async (req, res) => {
  try {
    const fixKey = getAdminFixKey(req);

    if (!process.env.ADMIN_KEY) {
      return res.status(403).json({
        message: "ADMIN_KEY env yok. Render Environment içine ADMIN_KEY eklemeden bu endpoint çalışmaz.",
      });
    }

    if (fixKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ message: "Yetkisiz." });
    }

    const targetEmail = String(req.body?.email || req.query?.email || ADMIN_EMAIL_FIX_TARGET)
      .trim()
      .toLowerCase();

    if (!targetEmail || !targetEmail.includes("@")) {
      return res.status(400).json({ message: "Geçerli bir email gerekli." });
    }

    const adminUser = await User.findOne({
      $or: [{ username: "admin" }, { email: "admin" }],
    });

    if (!adminUser) {
      return res.status(404).json({ message: "Admin kullanıcısı bulunamadı." });
    }

    const emailOwner = await User.findOne({ email: targetEmail });

    if (emailOwner && String(emailOwner._id) !== String(adminUser._id)) {
      return res.status(409).json({
        message: "Bu email başka kullanıcıda kayıtlı.",
      });
    }

    adminUser.email = targetEmail;
    await adminUser.save();

    res.json({
      message: "Admin email düzeltildi.",
      user: {
        id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
      },
    });
  } catch (error) {
    console.error("Admin email fix error:", error);
    res.status(500).json({ message: "Admin email düzeltilemedi." });
  }
});

router.post("/register", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Tüm alanlar zorunlu." });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        message: "Kullanıcı adı 3-20 karakter olmalı; sadece harf, sayı ve nokta kullanılabilir.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Geçerli bir email gerekli." });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: "Bu kullanıcı zaten var." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    const token = createToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Kayıt sırasında hata oluştu." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const emailOrUsername = normalizeLoginValue(
      req.body?.emailOrUsername || req.body?.email || req.body?.username
    );
    const password = req.body?.password;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: "Tüm alanlar zorunlu." });
    }

    const cleanLogin = emailOrUsername.trim();
    const lowerLogin = cleanLogin.toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: lowerLogin },
        { username: cleanLogin },
        { username: lowerLogin }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: "Kullanıcı bulunamadı." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Şifre yanlış." });
    }

    const token = createToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Giriş sırasında hata oluştu." });
  }
});


// Vory 1.0.8a - Auth polish hazırlığı.
// Mail kodlu gerçek reset akışı V1.0.8b'de SMTP/Resend bilgileriyle tamamlanacak.
router.post("/request-password-reset", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Geçerli bir email gerekli." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        message: "Bu email kayıtlıysa şifre sıfırlama akışı başlatılacak.",
        recoveryReady: false,
      });
    }

    return res.json({
      message: "Şifre sıfırlama isteği alındı. Mail kod sistemi V1.0.8b'de aktif edilecek.",
      recoveryReady: false,
    });
  } catch (error) {
    res.status(500).json({ message: "Şifre sıfırlama isteği alınamadı." });
  }
});

module.exports = router;