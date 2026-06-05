import { Camera, Clock3, Loader2, Save, Sparkles, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import WatchHistory from "./WatchHistory";

const USERNAME_COOLDOWN_DAYS = 7;

function Avatar({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt="avatar" className="h-24 w-24 rounded-[2rem] object-cover ring-2 ring-violet-300/35 shadow-[0_0_45px_rgba(139,92,246,0.22)]" />;
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-4xl font-black ring-2 ring-violet-300/35">
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
}

function formatWatchTime(seconds = 0) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.floor(safe / 60);
  return minutes > 0 ? `${minutes}m` : "0h";
}

function daysUntil(dateValue) {
  if (!dateValue) return 0;
  const last = new Date(dateValue).getTime();
  if (!last) return 0;
  const next = last + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((next - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function ProfileCard({
  authUser,
  onUserUpdate,
  roomCode = "",
  connectionStatus = "unknown",
  stats = {},
  profileProgress = null,
  watchHistory = [],
  continueWatching = null,
  onResumeWatch,
}) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "", statusMessage: "", favoritePlatforms: "" });

  const user = profileProgress || authUser || {};
  const mergedStats = { ...(user.profileStats || {}), ...(stats || {}) };
  const cooldownDays = daysUntil(user.lastUsernameChangedAt || authUser?.lastUsernameChangedAt);
  const usernameLocked = cooldownDays > 0;
  const level = Number(user.profileLevel || 1);
  const xp = Number(user.profileXp || 0);
  const nextLevelXp = Number(user.nextLevelXp || Math.max(100, level * level * 100));
  const currentLevelXp = Number(user.currentLevelXp || Math.max(0, (level - 1) * (level - 1) * 100));
  const xpProgress = nextLevelXp > currentLevelXp ? Math.min(100, Math.max(0, Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))) : 100;

  useEffect(() => {
    setForm({
      username: user.username || authUser?.username || "",
      bio: user.bio || authUser?.bio || "",
      statusMessage: user.statusMessage || authUser?.statusMessage || "",
      favoritePlatforms: (user.favoritePlatforms || authUser?.favoritePlatforms || []).join(", "),
    });
  }, [user.username, user.bio, user.statusMessage, authUser?.username]);

  const statCards = useMemo(() => [
    ["Rooms", mergedStats.roomsJoined || 0],
    ["Watch", formatWatchTime(mergedStats.watchSeconds)],
    ["Media", mergedStats.mediaPlayed || 0],
    ["Friends", mergedStats.friends || 0],
  ], [mergedStats]);

  async function uploadAvatar(file) {
    try {
      if (!file) return;
      const formData = new FormData();
      formData.append("avatar", file);
      const token = localStorage.getItem("vory_token");
      setLoading(true);
      const { data } = await api.post("/users/avatar", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      localStorage.setItem("vory_user", JSON.stringify(data.user));
      onUserUpdate?.(data.user);
      toast.success("Profil fotoğrafı güncellendi 📸");
    } catch (error) {
      toast.error(error.response?.data?.message || "Avatar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      setSaving(true);
      const platforms = form.favoritePlatforms
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);

      const { data } = await api.patch("/users/profile/settings", {
        username: form.username,
        bio: form.bio,
        statusMessage: form.statusMessage,
        favoritePlatforms: platforms,
      });

      const nextUser = data.user || data;
      localStorage.setItem("vory_user", JSON.stringify(nextUser));
      onUserUpdate?.(nextUser);
      toast.success(data.message || "Profil güncellendi ✨");
    } catch (error) {
      toast.error(error.response?.data?.message || "Profil güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-black/25 shadow-[0_28px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-violet-600/80 via-fuchsia-600/45 to-indigo-600/60 p-6">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_20%,white,transparent_18%),radial-gradient(circle_at_80%_10%,#f0abfc,transparent_18%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <div className="relative">
              <Avatar user={user} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black shadow-lg"
                disabled={loading}
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </div>

            <div className="min-w-0 pb-1">
              <p className="inline-flex rounded-full bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/65">Vory Profile</p>
              <h1 className="mt-3 truncate text-3xl font-black text-white sm:text-4xl">@{user.username || "user"}</h1>
              <p className="mt-1 truncate text-sm font-bold text-white/60">{user.email || authUser?.email || "Closed beta user"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-2xl bg-black/25 px-3 py-2 text-xs font-black text-emerald-100">{connectionStatus === "connected" ? "Online" : "Offline"}</span>
            <span className="rounded-2xl bg-black/25 px-3 py-2 text-xs font-black text-yellow-100"><Trophy size={14} className="inline" /> Level {level} · {xp} XP</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map(([label, value]) => (
              <div key={label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200/55">Profile Editor</p>
                <h2 className="mt-1 text-xl font-black text-white">Özel profil ayarları</h2>
              </div>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-white/45">
                {usernameLocked ? `${cooldownDays} gün kaldı` : "Username hazır"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Kullanıcı adı</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40 disabled:opacity-50"
                  value={form.username}
                  disabled={usernameLocked}
                  maxLength={20}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <p className="mt-2 text-xs font-bold text-white/30">3-20 karakter. Harf, rakam ve _ kullanılabilir. 7 günde 1 değişir.</p>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Durum mesajı</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
                  value={form.statusMessage}
                  maxLength={90}
                  placeholder="Film gecesine hazırım 🎬"
                  onChange={(e) => setForm((prev) => ({ ...prev, statusMessage: e.target.value }))}
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Biyografi</span>
                <textarea
                  className="mt-2 min-h-[110px] w-full resize-none rounded-[1.35rem] border border-white/10 bg-black/25 p-4 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
                  value={form.bio}
                  maxLength={180}
                  placeholder="Watch party, voice chat ve arkadaşlarla film gecesi..."
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                />
                <p className="mt-2 text-right text-xs font-bold text-white/30">{form.bio.length}/180</p>
              </label>

              <label className="block lg:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Favori platformlar</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
                  value={form.favoritePlatforms}
                  placeholder="YouTube, Netflix, Anime, Gaming"
                  onChange={(e) => setForm((prev) => ({ ...prev, favoritePlatforms: e.target.value }))}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.02] disabled:opacity-60"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Kaydet
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200/55">XP Progress</p>
            <div className="mt-4 flex items-center justify-between text-sm font-black text-white/70">
              <span>{xp} XP</span>
              <span>Level {level + 1}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-fuchsia-300 to-violet-300" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200/55">Continue</p>
                <h3 className="mt-1 text-lg font-black text-white">Devam Et</h3>
              </div>
              <Clock3 className="text-white/35" size={20} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-bold text-white/45">{continueWatching?.title || "Henüz devam edilecek medya yok."}</p>
            {continueWatching?.url ? (
              <button className="mt-4 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white/75 hover:bg-white/15" onClick={() => onResumeWatch?.(continueWatching)}>Devam Et</button>
            ) : null}
          </div>
        </aside>
      </div>

      {watchHistory?.length ? (
        <div className="border-t border-white/10 p-5">
          <WatchHistory items={watchHistory.slice(0, 6)} onResume={onResumeWatch} />
        </div>
      ) : null}
    </section>
  );
}
