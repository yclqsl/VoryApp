const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");
const User = require("../models/User");

const router = express.Router();

const ADMIN_EMAIL_FIX_TARGET = "yucelinizbusiness@gmail.com";
const USERNAME_REGEX = /^[a-z0-9.]{3,20}$/i;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

function getAdminFixKey(req) {
  return req.headers["x-admin-key"] || req.body?.adminKey || req.query?.key || "";
}

function normalizeLoginValue(value = "") {
  return String(value || "").trim();
}

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
    expiresIn: "7d",
  });
}

function createResetCode() {
  return String(crypto.randomInt(100000, 999999));
}

function hashResetValue(value = "") {
  return crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex");
}

function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function clearPasswordResetFields(user) {
  user.passwordResetCodeHash = "";
  user.passwordResetExpiresAt = null;
  user.passwordResetAttempts = 0;
  user.passwordResetTokenHash = "";
  user.passwordResetVerifiedAt = null;
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendPasswordResetEmail({ to, code }) {
  const resend = getResendClient();

  if (!resend) {
    throw new Error("RESEND_API_KEY env eksik.");
  }

  const from = process.env.FROM_EMAIL || "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to,
    subject: "VoryApp şifre sıfırlama kodun",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#07000f;color:#fff;padding:32px;border-radius:24px">
        <p style="letter-spacing:0.18em;color:#c4b5fd;font-size:12px;font-weight:800;text-transform:uppercase">VoryApp Recovery</p>
        <h1 style="margin:0 0 12px;font-size:28px">Şifre sıfırlama kodun</h1>
        <p style="color:#cbd5e1;font-size:15px;line-height:1.7">Bu kod 15 dakika geçerli. Kodu kimseyle paylaşma.</p>
        <div style="margin:24px 0;padding:18px 24px;border-radius:18px;background:rgba(139,92,246,.18);border:1px solid rgba(196,181,253,.25);font-size:34px;font-weight:900;letter-spacing:.35em;text-align:center">
          ${code}
        </div>
        <p style="color:#94a3b8;font-size:13px">Bu isteği sen yapmadıysan bu maili yok sayabilirsin.</p>
      </div>
    `,
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

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı." });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Bu kullanıcı zaten var." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = createToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
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
        { username: lowerLogin },
      ],
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
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Giriş sırasında hata oluştu." });
  }
});

router.post("/request-password-reset", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Geçerli bir email gerekli." });
    }

    const user = await User.findOne({ email });

    // Account enumeration engeli: olmayan email için de başarılıya yakın cevap.
    if (!user) {
      return res.json({
        message: "Bu email kayıtlıysa 6 haneli kod gönderildi.",
      });
    }

    const lastSentAt = user.passwordResetLastSentAt
      ? new Date(user.passwordResetLastSentAt).getTime()
      : 0;

    if (Date.now() - lastSentAt < RESET_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        message: "Yeni kod istemek için 60 saniye bekle.",
      });
    }

    const code = createResetCode();

    user.passwordResetCodeHash = hashResetValue(code);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    user.passwordResetAttempts = 0;
    user.passwordResetLastSentAt = new Date();
    user.passwordResetTokenHash = "";
    user.passwordResetVerifiedAt = null;

    await user.save();
    await sendPasswordResetEmail({ to: user.email, code });

    res.json({
      message: "6 haneli kod mail adresine gönderildi 📧",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({
      message: "Kod gönderilemedi. RESEND_API_KEY ve FROM_EMAIL ayarlarını kontrol et.",
    });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!isValidEmail(email) || !/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ message: "Email ve 6 haneli kod gerekli." });
    }

    const user = await User.findOne({ email });

    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      return res.status(400).json({ message: "Aktif şifre sıfırlama kodu bulunamadı." });
    }

    if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
      clearPasswordResetFields(user);
      await user.save();

      return res.status(400).json({ message: "Kodun süresi doldu. Yeni kod iste." });
    }

    if (Number(user.passwordResetAttempts || 0) >= RESET_MAX_ATTEMPTS) {
      clearPasswordResetFields(user);
      await user.save();

      return res.status(429).json({ message: "Çok fazla hatalı deneme. Yeni kod iste." });
    }

    if (hashResetValue(code) !== user.passwordResetCodeHash) {
      user.passwordResetAttempts = Number(user.passwordResetAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({ message: "Kod hatalı." });
    }

    const resetToken = createResetToken();

    user.passwordResetTokenHash = hashResetValue(resetToken);
    user.passwordResetVerifiedAt = new Date();
    await user.save();

    res.json({
      message: "Kod doğrulandı ✅",
      resetToken,
    });
  } catch (error) {
    console.error("Password reset verify error:", error);
    res.status(500).json({ message: "Kod doğrulanamadı." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const resetToken = String(req.body?.resetToken || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!isValidEmail(email) || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Email, doğrulama tokenı ve yeni şifre gerekli." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Yeni şifre en az 6 karakter olmalı." });
    }

    const user = await User.findOne({ email });

    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      return res.status(400).json({ message: "Aktif doğrulama bulunamadı. Yeni kod iste." });
    }

    if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
      clearPasswordResetFields(user);
      await user.save();

      return res.status(400).json({ message: "Doğrulama süresi doldu. Yeni kod iste." });
    }

    if (hashResetValue(resetToken) !== user.passwordResetTokenHash) {
      return res.status(401).json({ message: "Doğrulama tokenı geçersiz." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    clearPasswordResetFields(user);
    await user.save();

    res.json({
      message: "Şifre başarıyla güncellendi. Yeni şifrenle giriş yapabilirsin 🔐",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Şifre güncellenemedi." });
  }
});

module.exports = router;
