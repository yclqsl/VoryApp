import { ArrowLeft, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AnimatedBackground from "../components/AnimatedBackground";
import { api } from "../services/api";

const USERNAME_REGEX = /^[a-z0-9.]{3,20}$/i;
const CODE_REGEX = /^[0-9]{6}$/;

function normalizeAuthResponse(data = {}) {
  const user = data.user || data.data?.user || data;
  const token = data.token || data.data?.token || data.accessToken || data.jwt || "";
  return { user, token };
}

function cleanUsername(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 20);
}

function cleanResetCode(value = "") {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

export default function Auth({ initialMode = "login", onLogin, onBack }) {
  const [mode, setMode] = useState(initialMode || "login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode || "login");
  }, [initialMode]);

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isVerifyCode = mode === "verify-reset-code";
  const isResetPassword = mode === "reset-password";
  const isRecovery = isForgot || isVerifyCode || isResetPassword;

  const usernameValid = useMemo(() => {
    if (!isRegister) return true;
    return USERNAME_REGEX.test(username.trim());
  }, [isRegister, username]);

  function resetFormForMode(nextMode) {
    setMode(nextMode);
    setPassword("");

    if (nextMode === "login" || nextMode === "register") {
      setResetCode("");
      setResetToken("");
      setNewPassword("");
      setRecoveryEmail("");
    }
  }

  async function submitForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Şifre sıfırlama için geçerli bir email yaz.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/request-password-reset", {
        email: cleanEmail,
      });

      setRecoveryEmail(cleanEmail);
      setResetCode("");
      setResetToken("");
      setNewPassword("");
      toast.success(response.data?.message || "Kod mail adresine gönderildi 📧");
      setMode("verify-reset-code");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Şifre sıfırlama kodu gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function submitVerifyResetCode() {
    const cleanEmail = (recoveryEmail || email).trim().toLowerCase();
    const cleanCode = cleanResetCode(resetCode);

    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Email eksik. Tekrar kod iste.");
      setMode("forgot");
      return;
    }

    if (!CODE_REGEX.test(cleanCode)) {
      toast.error("6 haneli kodu yaz.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/verify-reset-code", {
        email: cleanEmail,
        code: cleanCode,
      });

      setResetToken(response.data?.resetToken || "");
      toast.success(response.data?.message || "Kod doğrulandı ✅");
      setMode("reset-password");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Kod doğrulanamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function submitResetPassword() {
    const cleanEmail = (recoveryEmail || email).trim().toLowerCase();

    if (!resetToken) {
      toast.error("Kod doğrulaması eksik. Tekrar kod gir.");
      setMode("verify-reset-code");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalı.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/reset-password", {
        email: cleanEmail,
        resetToken,
        newPassword,
      });

      toast.success(response.data?.message || "Şifre güncellendi 🔐");
      setEmail(cleanEmail);
      setPassword("");
      setNewPassword("");
      setResetCode("");
      setResetToken("");
      setRecoveryEmail("");
      setMode("login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();

    if (isForgot) {
      await submitForgotPassword();
      return;
    }

    if (isVerifyCode) {
      await submitVerifyResetCode();
      return;
    }

    if (isResetPassword) {
      await submitResetPassword();
      return;
    }

    if (!email.trim() || !password.trim()) {
      toast.error(isRegister ? "Email ve şifre gerekli." : "Email/kullanıcı adı ve şifre gerekli.");
      return;
    }

    if (isRegister && !username.trim()) {
      toast.error("Kullanıcı adı gerekli.");
      return;
    }

    if (isRegister && !USERNAME_REGEX.test(username.trim())) {
      toast.error("Kullanıcı adı 3-20 karakter olmalı; sadece harf, sayı ve nokta kullanılabilir.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const cleanIdentifier = email.trim();
      const loginPayload = {
        emailOrUsername: cleanIdentifier,
        identifier: cleanIdentifier,
        login: cleanIdentifier,
        username: cleanIdentifier,
        email: cleanIdentifier.toLowerCase(),
        password,
      };
      const payload = isRegister
        ? {
            username: cleanUsername(username),
            email: email.trim().toLowerCase(),
            password,
          }
        : loginPayload;

      const response = await api.post(endpoint, payload);
      const { user, token } = normalizeAuthResponse(response.data || {});

      if (!user || !token) {
        throw new Error("Auth response eksik.");
      }

      toast.success(isRegister ? "Hesap oluşturuldu 🚀" : "Giriş yapıldı 👑");
      onLogin?.(user, token);
    } catch (error) {
      toast.error(error?.response?.data?.message || (isRegister ? "Kayıt olunamadı." : "Giriş yapılamadı."));
    } finally {
      setLoading(false);
    }
  }

  const title =
    isForgot
      ? "Şifreni sıfırla"
      : isVerifyCode
        ? "Mail kodunu gir"
        : isResetPassword
          ? "Yeni şifre oluştur"
          : isRegister
            ? "Join Vory"
            : "Welcome back 👋";

  const subtitle =
    isForgot
      ? "Email adresini yaz. Sana 15 dakika geçerli 6 haneli kod göndereceğiz."
      : isVerifyCode
        ? `${recoveryEmail || email} adresine gelen 6 haneli kodu gir.`
        : isResetPassword
          ? "Kod doğrulandı. Şimdi yeni şifreni belirle."
          : isRegister
            ? "Watch party odalarını oluşturmak ve arkadaşlarını davet etmek için hesabını aç."
            : "Odanı geri yükle, arkadaşlarını gör ve watch party'ye devam et.";

  return (
    <main className="vory-auth-shell">
      <AnimatedBackground theme="neon" />

      <button type="button" className="vory-auth-back" onClick={onBack}>
        <ArrowLeft size={17} /> Landing
      </button>

      <section className="vory-auth-grid">
        <div className="vory-auth-card">
          <div className="vory-auth-logo">V</div>
          <p className="vory-premium-kicker vory-auth-kicker">
            {isRecovery ? "Account recovery" : "Closed beta access"}
          </p>
          <h1>{title}</h1>
          <p className="vory-auth-subtitle">{subtitle}</p>

          {isRecovery && (
            <div className="mb-4 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
              <span className={`rounded-full px-3 py-2 text-center ${isForgot ? "bg-violet-500/20 text-violet-100" : "bg-white/[0.04]"}`}>
                Email
              </span>
              <span className={`rounded-full px-3 py-2 text-center ${isVerifyCode ? "bg-violet-500/20 text-violet-100" : "bg-white/[0.04]"}`}>
                Kod
              </span>
              <span className={`rounded-full px-3 py-2 text-center ${isResetPassword ? "bg-violet-500/20 text-violet-100" : "bg-white/[0.04]"}`}>
                Şifre
              </span>
            </div>
          )}

          <form className="vory-auth-form" onSubmit={submitAuth}>
            {isRegister && (
              <label>
                <span>Username</span>
                <div className="vory-auth-input-wrap">
                  <UserRound size={18} />
                  <input
                    value={username}
                    onChange={(event) => setUsername(cleanUsername(event.target.value))}
                    placeholder="kullanici.adi"
                    autoComplete="username"
                    maxLength={20}
                  />
                </div>
                <small className={username && !usernameValid ? "text-red-300" : "text-white/35"}>
                  Sadece harf, sayı ve nokta. Alt çizgi kullanılamaz. 3-20 karakter.
                </small>
              </label>
            )}

            {!isVerifyCode && !isResetPassword && (
              <label>
                <span>{isRegister || isForgot ? "Email" : "Email or username"}</span>
                <div className="vory-auth-input-wrap">
                  <Mail size={18} />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={isRegister || isForgot ? "you@vory.app" : "email veya username"}
                    type={isRegister || isForgot ? "email" : "text"}
                    autoComplete={isRegister || isForgot ? "email" : "username"}
                  />
                </div>
              </label>
            )}

            {isVerifyCode && (
              <label>
                <span>6 haneli kod</span>
                <div className="vory-auth-input-wrap">
                  <ShieldCheck size={18} />
                  <input
                    value={resetCode}
                    onChange={(event) => setResetCode(cleanResetCode(event.target.value))}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                </div>
              </label>
            )}

            {!isForgot && !isVerifyCode && (
              <label>
                <span>{isResetPassword ? "Yeni şifre" : "Password"}</span>
                <div className="vory-auth-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    value={isResetPassword ? newPassword : password}
                    onChange={(event) =>
                      isResetPassword
                        ? setNewPassword(event.target.value)
                        : setPassword(event.target.value)
                    }
                    placeholder="••••••••"
                    type="password"
                    autoComplete={isRegister || isResetPassword ? "new-password" : "current-password"}
                  />
                </div>
              </label>
            )}

            {isRegister && (
              <p className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/38">
                Kullanıcı adını sonradan yalnızca 7 günde bir değiştirebilirsin.
              </p>
            )}

            {isForgot && (
              <p className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/38">
                Kod gelmezse spam klasörünü kontrol et. 60 saniye içinde tekrar kod isteyemezsin.
              </p>
            )}

            <button type="submit" className="vory-glow-btn vory-auth-submit" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isForgot
                ? "Kod gönder"
                : isVerifyCode
                  ? "Kodu doğrula"
                  : isResetPassword
                    ? "Şifreyi güncelle"
                    : isRegister
                      ? "Create account"
                      : "Sign in"}
            </button>
          </form>

          {!isRegister && !isRecovery && (
            <button type="button" className="vory-auth-switch" onClick={() => resetFormForMode("forgot")}>
              Şifremi unuttum?
            </button>
          )}

          {isVerifyCode && (
            <button type="button" className="vory-auth-switch" onClick={() => resetFormForMode("forgot")}>
              Kodu tekrar gönder
            </button>
          )}

          <button
            type="button"
            className="vory-auth-switch"
            onClick={() => resetFormForMode(isRegister || isRecovery ? "login" : "register")}
          >
            {isRegister || isRecovery ? "Zaten hesabın var mı? Sign in" : "Hesabın yok mu? Create account"}
          </button>
        </div>

        <aside className="vory-auth-preview">
          <span className="vory-live-dot">LIVE PREVIEW</span>
          <h2>One room. Everyone synced.</h2>
          <p>VoryApp giriş sonrası direkt video, chat, voice ve davet akışına odaklanır.</p>
          <div className="vory-auth-preview-screen">
            <div className="vory-auth-video-line" />
            <div className="vory-auth-video-line short" />
            <div className="vory-auth-mini-row"><span /> <span /> <span /></div>
          </div>
        </aside>
      </section>
    </main>
  );
}
