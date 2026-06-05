import { Camera, Clock3, Loader2, Save, ShieldCheck, Sparkles, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import WatchHistory from "./WatchHistory";

function formatDate(value) {
  if (!value) return "Bugün değiştirilebilir";
  try {
    return new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "Yakında";
  }
}

function calculateXp(stats = {}) {
  return Math.max(0, Math.floor(
    Number(stats?.roomsJoined || 0) * 10 +
    Number(stats?.watchSeconds || 0) * 0.025 +
    Number(stats?.mediaPlayed || 0) * 7 +
    Number(stats?.messagesSent || 0) * 2 +
    Number(stats?.reactionsUsed || 0) +
    Number(stats?.invitesSent || 0) * 5 +
    Number(stats?.friends || 0) * 20
  ));
}

function calculateLevel(xp = 0) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1);
}

function Avatar({ user, loading, onClick }) {
  if (user?.avatar) {
    return (
      <button type="button" onClick={onClick} className="group relative h-24 w-24 overflow-hidden rounded-[2rem] ring-2 ring-violet-300/35 shadow-[0_0_45px_rgba(139,92,246,0.22)]">
        <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
          {loading ? <Loader2 className="animate-spin" size={22} /> : <Camera size={22} />}
        </span>
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className="group relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-4xl font-black ring-2 ring-violet-300/35 shadow-[0_0_45px_rgba(217,70,239,0.24)]">
      {(user?.username || "V").charAt(0).toUpperCase()}
      <span className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-black/45 opacity-0 transition group-hover:opacity-100">
        {loading ? <Loader2 className="animate-spin" size={22} /> : <Camera size={22} />}
      </span>
    </button>
  );
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
  const [historyOpen, setHistoryOpen] = useState(false);

  const user = profileProgress || authUser || {};
  const mergedStats = { ...(user.profileStats || {}), ...(stats || {}) };
  const xp = Number(user.profileXp ?? calculateXp(mergedStats));
  const level = Number(user.profileLevel ?? calculateLevel(xp));
  const cooldown = user.usernameCooldown || {};
  const canChangeUsername = cooldown.canChangeUsername !== false;
  const nextChangeAt = cooldown.nextChangeAt || null;

  const [form, setForm] = useState({
    username: user.username || authUser?.username || "",
    bio: user.bio || "",
    statusMessage: user.statusMessage || "",
    favoritePlatforms: (user.favoritePlatforms || authUser?.favoritePlatforms || []).join(", "),
  });

  useEffect(() => {
    setForm({
      username: user.username || authUser?.username || "",
      bio: user.bio || "",
      statusMessage: user.statusMessage || "",
      favoritePlatforms: (user.favoritePlatforms || authUser?.favoritePlatforms || []).join(", "),
    });
  }, [user.username, user.bio, user.statusMessage, JSON.stringify(user.favoritePlatforms || authUser?.favoritePlatforms || [])]);

  const compactHistory = historyOpen ? watchHistory : (watchHistory || []).slice(0, 3);
  const hiddenHistoryCount = Math.max(0, (watchHistory || []).length - 3);

  const statCards = useMemo(() => [
    ["Rooms", mergedStats.roomsJoined || 0],
    ["Watch", stats.watchTime || "0h"],
    ["Media", mergedStats.mediaPlayed || 0],
    ["Friends", mergedStats.friends || 0],
  ], [mergedStats, stats.watchTime]);

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
      const favoritePlatforms = String(form.favoritePlatforms || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);

      const { data } = await api.patch("/users/profile/settings", {
        username: form.username,
        bio: form.bio,
        statusMessage: form.statusMessage,
        favoritePlatforms,
      });

      const nextUser = data.rawUser || data.user;
      const savedLocal = {
        ...(JSON.parse(localStorage.getItem("vory_user") || "{}")),
        ...nextUser,
        username: data.user?.username || nextUser?.username || form.username,
        bio: data.user?.bio ?? nextUser?.bio ?? form.bio,
        statusMessage: data.user?.statusMessage ?? nextUser?.statusMessage ?? form.statusMessage,
        favoritePlatforms: data.user?.favoritePlatforms || nextUser?.favoritePlatforms || favoritePlatforms,
      };

      localStorage.setItem("vory_user", JSON.stringify(savedLocal));
      onUserUpdate?.(savedLocal);
      toast.success(data.message || "Profil güncellendi ✨");
    } catch (error) {
      toast.error(error.response?.data?.message || "Profil güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => uploadAvatar(e.target.files?.[0])}
      />

      <div className="relative h-32 bg-gradient-to-r from-violet-600/80 via-fuchsia-600/60 to-indigo-600/70">
        <div className="absolute left-4 top-4 rounded-full bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur-xl">
          Vory Profile
        </div>
        <div className="absolute bottom-4 right-4 rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-black text-emerald-100">
          {connectionStatus === "connected" ? "Online" : "Offline"}
        </div>
      </div>

      <div className="-mt-12 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <Avatar user={{ ...user, username: form.username }} loading={loading} onClick={() => fileInputRef.current?.click()} />
            <div className="min-w-0 pb-1">
              <h2 className="truncate text-3xl font-black text-white">@{user.username || form.username || "user"}</h2>
              <p className="mt-1 truncate text-sm font-bold text-white/45">{user.email || authUser?.email || "Vory member"}</p>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-black text-white/55">
                <Trophy size={14} /> Level {level} • {xp} XP
              </p>
            </div>
          </div>

          {continueWatching?.url ? (
            <button type="button" onClick={() => onResumeWatch?.(continueWatching)} className="btn-secondary w-full xl:w-auto">
              <Clock3 className="mr-2 inline" size={16} /> Devam Et
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</p>
              <p className="mt-1 text-xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.75rem] border border-violet-300/12 bg-violet-500/[0.06] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200/55">Profile Editor</p>
              <h3 className="mt-1 text-lg font-black text-white">Özel profil ayarları</h3>
            </div>
            <span className="rounded-full bg-black/25 px-3 py-1 text-[10px] font-black text-white/45">
              Username: {canChangeUsername ? "hazır" : formatDate(nextChangeAt)}
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black text-white/45">Kullanıcı adı</span>
              <input
                className="input"
                value={form.username}
                disabled={!canChangeUsername}
                placeholder="vory_user"
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              />
              <p className="mt-1 text-[11px] font-bold text-white/30">3-20 karakter. Harf, rakam ve _ kullanılabilir. 7 günde 1 değişir.</p>
            </label>

            <label className="block">
              <span className="text-xs font-black text-white/45">Durum mesajı</span>
              <input
                className="input"
                maxLength={90}
                value={form.statusMessage}
                placeholder="Film gecesine hazırım 🎬"
                onChange={(e) => setForm((prev) => ({ ...prev, statusMessage: e.target.value }))}
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-black text-white/45">Biyografi</span>
            <textarea
              className="input min-h-[96px] resize-none"
              maxLength={180}
              value={form.bio}
              placeholder="Watch party, voice chat ve arkadaşlarla film gecesi..."
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
            />
            <p className="mt-1 text-right text-[11px] font-bold text-white/30">{form.bio.length}/180</p>
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-black text-white/45">Favori platformlar</span>
            <input
              className="input"
              value={form.favoritePlatforms}
              placeholder="YouTube, Netflix, Anime, Gaming"
              onChange={(e) => setForm((prev) => ({ ...prev, favoritePlatforms: e.target.value }))}
            />
          </label>

          <button type="button" onClick={saveProfile} disabled={saving} className="btn mt-4 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} Profili Kaydet
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-4">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40">
              <ShieldCheck size={14} /> Hakkında
            </p>
            <p className="text-sm font-bold leading-6 text-white/65">
              {user.bio || form.bio || "Henüz biyografi eklenmedi."}
            </p>
            <p className="mt-3 text-sm font-bold text-violet-200/70">
              {user.statusMessage || form.statusMessage || (roomCode ? `Room ${roomCode} içinde aktif.` : "Lobby'de online.")}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-4">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40">
              <Sparkles size={14} /> Platformlar
            </p>
            <div className="flex flex-wrap gap-2">
              {(user.favoritePlatforms?.length ? user.favoritePlatforms : ["YouTube", "Watch Party", "Voice", "Screen Share"]).map((item) => (
                <span key={item} className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-white/55">{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <WatchHistory
            items={compactHistory}
            onResume={onResumeWatch}
            hiddenCount={hiddenHistoryCount}
            expanded={historyOpen}
            onToggle={() => setHistoryOpen((prev) => !prev)}
          />
        </div>
      </div>
    </section>
  );
}
