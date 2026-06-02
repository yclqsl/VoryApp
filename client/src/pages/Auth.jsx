import { ArrowLeft, Eye, EyeOff, Lock, Mail, User, Zap } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function Auth({ onLogin, onBack }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event?.preventDefault?.();

    try {
      if (loading) return;

      if (mode === "login" && (!emailOrUsername.trim() || !password.trim())) {
        toast.error("E-posta/kullanıcı adı ve şifre gir.");
        return;
      }

      if (
        mode === "register" &&
        (!username.trim() || !email.trim() || !password.trim())
      ) {
        toast.error("Kullanıcı adı, e-posta ve şifre gir.");
        return;
      }

      setLoading(true);

      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";

      const payload =
        mode === "login"
          ? {
              emailOrUsername: emailOrUsername.trim(),
              password,
            }
          : {
              username: username.trim(),
              email: email.trim(),
              password,
            };

      const { data } = await api.post(endpoint, payload);

      toast.success(mode === "login" ? "Giriş başarılı 🚀" : "Hesap oluşturuldu 🚀");
      onLogin(data.user, data.token);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setPassword("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080711] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-0 h-[430px] w-[430px] rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute right-0 top-28 h-[430px] w-[430px] rounded-full bg-fuchsia-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[430px] w-[430px] rounded-full bg-indigo-700/20 blur-3xl" />
      </div>

      <section className="relative z-10 grid min-h-screen items-center gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-12">
        <div className="mx-auto max-w-3xl lg:mx-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black text-white/60 transition hover:bg-white/[0.09] hover:text-white"
          >
            <ArrowLeft size={16} />
            Landing'e dön
          </button>

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200">
            <Zap size={14} />
            VoryApp Beta Access
          </div>

          <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
            Arkadaşlarınla
            <span className="block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-emerald-200 bg-clip-text text-transparent">
              aynı odada buluş.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/50">
            Watch party, voice chat, screen share, media queue ve presence sistemi
            tek yerde. Giriş yap, oda kur, linki paylaş.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["Sync", "Watch Party"],
              ["Voice", "Live Chat"],
              ["Share", "Screen"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-2xl font-black">{title}</p>
                <p className="mt-1 text-xs text-white/35">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[460px]">
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-violet-500/15 blur-2xl" />

            <form
              onSubmit={submit}
              className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/35 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7"
            >
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-13 w-13 items-center justify-center rounded-3xl bg-violet-500/25 text-2xl font-black shadow-[0_0_30px_rgba(139,92,246,0.35)]">
                  V
                </div>

                <div>
                  <h2 className="text-2xl font-black">VoryApp</h2>
                  <p className="text-sm text-white/40">
                    {mode === "login" ? "Hesabına giriş yap" : "Yeni hesap oluştur"}
                  </p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-white/[0.045] p-2">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                    mode === "login"
                      ? "bg-violet-500/25 text-white shadow-[0_0_24px_rgba(139,92,246,0.2)]"
                      : "text-white/40 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  Giriş
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                    mode === "register"
                      ? "bg-violet-500/25 text-white shadow-[0_0_24px_rgba(139,92,246,0.2)]"
                      : "text-white/40 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  Kayıt
                </button>
              </div>

              <div className="space-y-3">
                {mode === "register" && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/35">
                        Kullanıcı adı
                      </span>
                      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-violet-400/40">
                        <User size={18} className="text-white/30" />
                        <input
                          placeholder="yucel"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/35">
                        E-posta
                      </span>
                      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-violet-400/40">
                        <Mail size={18} className="text-white/30" />
                        <input
                          type="email"
                          placeholder="mail@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                        />
                      </div>
                    </label>
                  </>
                )}

                {mode === "login" && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/35">
                      E-posta veya kullanıcı adı
                    </span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-violet-400/40">
                      <Mail size={18} className="text-white/30" />
                      <input
                        placeholder="admin veya mail@example.com"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-white/35">
                    Şifre
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-violet-400/40">
                    <Lock size={18} className="text-white/30" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-white/35 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center rounded-3xl bg-white px-5 py-4 text-base font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "İşleniyor..."
                  : mode === "login"
                    ? "Giriş Yap"
                    : "Kayıt Ol"}
              </button>

              <p className="mt-5 text-center text-xs text-white/35">
                VoryApp Beta • Watch together, talk together.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
