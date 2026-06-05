import { ArrowLeft, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AnimatedBackground from "../components/AnimatedBackground";
import { api } from "../services/api";

const USERNAME_REGEX = /^[a-z0-9.]{3,20}$/i;

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

export default function Auth({ initialMode = "login", onLogin, onBack }) {
  const [mode, setMode] = useState(initialMode || "login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode || "login");
  }, [initialMode]);

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";

  const usernameValid = useMemo(() => {
    if (!isRegister) return true;
    return USERNAME_REGEX.test(username.trim());
  }, [isRegister, username]);

  function resetFormForMode(nextMode) {
    setMode(nextMode);
    setPassword("");
  }

  async function submitForgotPassword(event) {
    event.preventDefault();

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

      toast.success(response.data?.message || "Şifre sıfırlama isteği alındı.");
      resetFormForMode("login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Şifre sıfırlama isteği gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();

    if (isForgot) {
      await submitForgotPassword(event);
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

  const title = isForgot
    ? "Şifreni sıfırla"
    : isRegister
      ? "Create your Vory account"
      : "Welcome back";

  const subtitle = isForgot
    ? "Email adresini yaz. Bir sonraki sprintte bu akış mail kodu ile tamamlanacak."
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
          <p className="vory-premium-kicker vory-auth-kicker">Closed beta access</p>
          <h1>{title}</h1>
          <p className="vory-auth-subtitle">{subtitle}</p>

          <form className="vory-auth-form" onSubmit={submitAuth}>
            {isRegister && (
              <label>
                <span>Username</span>
                <div className="vory-auth-input-wrap">
                  <UserRound size={18} />
                  <input
                    value={username}
                    onChange={(event) => setUsername(cleanUsername(event.target.value))}
                    placeholder="yucel.aslan"
                    autoComplete="username"
                    maxLength={20}
                  />
                </div>
                <small className={username && !usernameValid ? "text-red-300" : "text-white/35"}>
                  Sadece harf, sayı ve nokta. Alt çizgi kullanılamaz. 3-20 karakter.
                </small>
              </label>
            )}

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

            {!isForgot && (
              <label>
                <span>Password</span>
                <div className="vory-auth-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    type="password"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                  />
                </div>
              </label>
            )}

            {isRegister && (
              <p className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/38">
                Kullanıcı adını sonradan yalnızca 7 günde bir değiştirebilirsin.
              </p>
            )}

            <button type="submit" className="vory-glow-btn vory-auth-submit" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isForgot ? "Sıfırlama isteği gönder" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          {!isRegister && !isForgot && (
            <button type="button" className="vory-auth-switch" onClick={() => resetFormForMode("forgot")}>
              Şifremi unuttum?
            </button>
          )}

          <button
            type="button"
            className="vory-auth-switch"
            onClick={() => resetFormForMode(isRegister || isForgot ? "login" : "register")}
          >
            {isRegister || isForgot ? "Zaten hesabın var mı? Sign in" : "Hesabın yok mu? Create account"}
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
