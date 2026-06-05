import { ArrowLeft, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AnimatedBackground from "../components/AnimatedBackground";
import { api } from "../services/api";

function normalizeAuthResponse(data = {}) {
  const user = data.user || data.data?.user || data;
  const token = data.token || data.data?.token || data.accessToken || data.jwt || "";
  return { user, token };
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

  async function submitAuth(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Email ve şifre gerekli knks.");
      return;
    }

    if (isRegister && !username.trim()) {
      toast.error("Username gerekli knks.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister
        ? { username: username.trim(), email: email.trim(), password }
        : { emailOrUsername: email.trim(), password };

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
          <h1>{isRegister ? "Create your Vory account" : "Welcome back"}</h1>
          <p className="vory-auth-subtitle">
            {isRegister
              ? "Watch party odalarını oluşturmak ve arkadaşlarını davet etmek için hesabını aç."
              : "Odanı geri yükle, arkadaşlarını gör ve watch party'ye devam et."}
          </p>

          <form className="vory-auth-form" onSubmit={submitAuth}>
            {isRegister && (
              <label>
                <span>Username</span>
                <div className="vory-auth-input-wrap">
                  <UserRound size={18} />
                  <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="yucel" autoComplete="username" />
                </div>
              </label>
            )}

            <label>
              <span>{isRegister ? "Email" : "Email or username"}</span>
              <div className="vory-auth-input-wrap">
                <Mail size={18} />
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={isRegister ? "you@vory.app" : "email veya username"} type={isRegister ? "email" : "text"} autoComplete={isRegister ? "email" : "username"} />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="vory-auth-input-wrap">
                <LockKeyhole size={18} />
                <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" type="password" autoComplete={isRegister ? "new-password" : "current-password"} />
              </div>
            </label>

            <button type="submit" className="vory-glow-btn vory-auth-submit" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <button type="button" className="vory-auth-switch" onClick={() => setMode(isRegister ? "login" : "register")}>
            {isRegister ? "Zaten hesabın var mı? Sign in" : "Hesabın yok mu? Create account"}
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
