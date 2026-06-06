import {
  Camera,
  Crown,
  Gem,
  Loader2,
  ShieldCheck,
  Trophy,
  UserRound,
  Save,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

const USERNAME_COOLDOWN_DAYS = 7;

function sanitizeUsername(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 20);
}

function daysUntilUsernameChange(dateValue) {
  if (!dateValue) return 0;
  const lastChange = new Date(dateValue).getTime();
  if (!lastChange) return 0;
  const nextChange = lastChange + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((nextChange - Date.now()) / (24 * 60 * 60 * 1000)));
}

function usernameCooldownLabel(dateValue) {
  if (!dateValue) return "Kullanıcı adını 7 günde 1 kez değiştirebilirsin.";

  const lastChange = new Date(dateValue).getTime();
  if (!lastChange) return "Kullanıcı adını 7 günde 1 kez değiştirebilirsin.";

  const nextChange = lastChange + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = nextChange - Date.now();

  if (remainingMs <= 0) {
    return "Kullanıcı adını değiştirebilirsin. Değiştirince 7 gün kilitlenir.";
  }

  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days <= 0) return `Kullanıcı adını tekrar değiştirmek için ${hours} saat beklemelisin.`;
  if (hours <= 0) return `Kullanıcı adını tekrar değiştirmek için ${days} gün beklemelisin.`;
  return `Kullanıcı adını tekrar değiştirmek için ${days} gün ${hours} saat beklemelisin.`;
}

function Avatar({ user, frame = "rookie" }) {
  const frameClass =
    frame === "founder"
      ? "ring-yellow-300/55 shadow-[0_0_35px_rgba(250,204,21,0.25)]"
      : frame === "galaxy"
        ? "ring-indigo-300/45 shadow-[0_0_35px_rgba(129,140,248,0.22)]"
        : frame === "cinema"
          ? "ring-red-300/40 shadow-[0_0_35px_rgba(248,113,113,0.18)]"
          : frame === "neon"
            ? "ring-fuchsia-300/40 shadow-[0_0_35px_rgba(217,70,239,0.2)]"
            : "ring-violet-300/25";

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className={`h-20 w-20 rounded-[1.75rem] object-cover ring-2 sm:h-16 sm:w-16 sm:rounded-3xl ${frameClass}`}
      />
    );
  }

  return (
    <div className={`flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl font-black ring-2 sm:h-16 sm:w-16 sm:rounded-3xl sm:text-2xl ${frameClass}`}>
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
}

function compactNumber(value = 0) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  return String(safeValue);
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

function xpForLevel(level = 1) {
  return Math.pow(Math.max(1, Number(level) || 1) - 1, 2) * 100;
}

function buildLocalBadges(user, stats = {}, level = 1) {
  const badges = new Set(user?.profileBadges?.length ? user.profileBadges : ["Closed Beta Tester"]);
  badges.add("Vory Explorer");
  if (level >= 5) badges.add("Rising Star");
  if (Number(stats?.mediaPlayed || 0) >= 25) badges.add("Movie Addict");
  if (Number(stats?.watchSeconds || 0) >= 36000) badges.add("Marathon Watcher");
  if (Number(stats?.roomsJoined || 0) >= 50) badges.add("Top Host");
  if (Number(stats?.reactionsUsed || 0) >= 100) badges.add("Hype Machine");
  if (Number(stats?.messagesSent || 0) >= 250) badges.add("Chat Legend");
  if (Number(stats?.friends || 0) >= 25) badges.add("Social Butterfly");
  return Array.from(badges).slice(0, 12);
}

function achievementIcon(achievement = {}) {
  return achievement.icon || "🏆";
}

function badgeIcon(badge = "") {
  const clean = badge.toLowerCase();
  if (clean.includes("founder")) return "👑";
  if (clean.includes("movie") || clean.includes("watch")) return "🎬";
  if (clean.includes("host")) return "🔥";
  if (clean.includes("social")) return "🤝";
  if (clean.includes("chat")) return "💬";
  if (clean.includes("hype")) return "⚡";
  if (clean.includes("early") || clean.includes("beta")) return "🏆";
  return "✨";
}

function getFrameLabel(frame = "rookie") {
  if (frame === "founder") return "Founder Frame";
  if (frame === "galaxy") return "Galaxy Frame";
  if (frame === "cinema") return "Cinema Frame";
  if (frame === "neon") return "Neon Frame";
  return "Rookie Frame";
}

export default function ProfileCard({
  authUser,
  onUserUpdate,
  roomCode = "",
  connectionStatus = "unknown",
  stats = {},
  profileProgress = null,
}) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "" });

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

  const mergedStats = { ...(profileProgress?.profileStats || authUser?.profileStats || {}), ...(stats || {}) };
  const username = profileProgress?.username || authUser?.username || "user";
  const email = profileProgress?.email || authUser?.email || "Closed beta user";
  const online = connectionStatus === "connected";
  const xp = Number(profileProgress?.profileXp ?? authUser?.profileXp ?? calculateXp(mergedStats));
  const level = Number(profileProgress?.profileLevel ?? authUser?.profileLevel ?? calculateLevel(xp));
  const currentLevelXp = Number(profileProgress?.currentLevelXp ?? xpForLevel(level));
  const nextLevelXp = Number(profileProgress?.nextLevelXp ?? xpForLevel(level + 1));
  const xpProgress = nextLevelXp > currentLevelXp ? Math.min(100, Math.max(0, Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))) : 100;
  const activeCustomizations = profileProgress?.activeCustomizations || profileProgress?.customization?.active || {};
  const frame = activeCustomizations.frame || profileProgress?.profileFrame || authUser?.profileFrame || (level >= 10 ? "neon" : "rookie");
  const activeTheme = activeCustomizations.theme || profileProgress?.profileTheme || authUser?.profileTheme || "vory";
  const activeGlow = activeCustomizations.glow || "none";
  const badges = profileProgress?.profileBadges?.length ? profileProgress.profileBadges : buildLocalBadges(authUser, mergedStats, level);
  const achievements = profileProgress?.achievements?.length ? profileProgress.achievements : [];
  const creatorProfile = profileProgress?.creatorProfile || authUser?.creatorProfile || {};
  const followersCount = Number(profileProgress?.followersCount || authUser?.followers?.length || 0);
  const followingCount = Number(profileProgress?.followingCount || authUser?.following?.length || 0);
  const creatorBadges = profileProgress?.creatorBadges || creatorProfile?.creatorBadges || [];
  const bio = profileProgress?.bio?.trim()
    ? profileProgress.bio.trim()
    : authUser?.bio?.trim()
      ? authUser.bio.trim()
      : "";
  const usernameLastChangedAt = profileProgress?.lastUsernameChangedAt || authUser?.lastUsernameChangedAt;
  const cooldownDays = daysUntilUsernameChange(usernameLastChangedAt);
  const usernameLocked = cooldownDays > 0;
  const usernameReminder = usernameCooldownLabel(usernameLastChangedAt);

  useEffect(() => {
    setForm({
      username: sanitizeUsername(username || authUser?.username || ""),
      bio: profileProgress?.bio ?? authUser?.bio ?? "",
    });
  }, [username, profileProgress?.bio, authUser?.username, authUser?.bio]);

  async function saveProfile() {
    const cleanUsername = sanitizeUsername(form.username);
    const cleanBio = String(form.bio || "").slice(0, 180);

    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error("Kullanıcı adı en az 3 karakter olmalı.");
      return;
    }

    setSaving(true);

    const savedUser = (() => {
      try {
        return JSON.parse(localStorage.getItem("vory_user") || "{}");
      } catch {
        return {};
      }
    })();

    const nextLocalUser = {
      ...(savedUser || {}),
      ...(authUser || {}),
      username: cleanUsername,
      bio: cleanBio,
    };

    const endpoints = [
      ["patch", "/users/profile/settings"],
      ["patch", "/users/profile"],
      ["put", "/users/profile"],
      ["patch", "/users/me"],
    ];

    try {
      let data = null;
      let serverSaved = false;

      for (const [method, url] of endpoints) {
        try {
          const response = await api[method](url, {
            username: cleanUsername,
            bio: cleanBio,
          });
          data = response?.data;
          serverSaved = true;
          break;
        } catch (requestError) {
          const status = requestError?.response?.status;
          if (status && ![404, 405].includes(status)) {
            throw requestError;
          }
        }
      }

      const nextUser = data?.user || data || nextLocalUser;
      localStorage.setItem("vory_user", JSON.stringify({ ...nextLocalUser, ...nextUser }));
      onUserUpdate?.({ ...nextLocalUser, ...nextUser });
      setForm((prev) => ({ ...prev, username: cleanUsername, bio: cleanBio }));

      toast.success(serverSaved ? "Profil güncellendi ✨" : "Profil kaydedildi ✨");
    } catch (error) {
      const message = error?.response?.data?.message || "Profil güncellenemedi.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`glass overflow-hidden p-0 profile-theme-${activeTheme} ${activeGlow !== "none" ? "shadow-[0_0_70px_rgba(217,70,239,0.16)]" : ""}`}>
      <div className="relative h-24 bg-gradient-to-r from-violet-600/80 via-fuchsia-600/60 to-indigo-600/70 sm:h-24">
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 backdrop-blur-xl sm:text-xs">
          <Gem size={13} /> Vory Profile
        </div>
        <div className="absolute bottom-4 right-4 rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-black text-yellow-100">
          {getFrameLabel(frame)}
        </div>
      </div>

      <div className="-mt-10 p-4 sm:-mt-8">
        <div className="flex items-end justify-between gap-4">
          <div className="relative">
            <Avatar user={{ ...authUser, username, avatar: profileProgress?.avatar || authUser?.avatar }} frame={frame} />
            <button className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40 transition hover:scale-105 disabled:opacity-60 sm:h-9 sm:w-9" onClick={() => fileInputRef.current?.click()} disabled={loading} title="Profil fotoğrafı değiştir" type="button">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => uploadAvatar(event.target.files?.[0])} />
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${online ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/40"}`}>
              <ShieldCheck size={13} /> {online ? "Online" : "Offline"}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-black text-yellow-200">
              <Trophy size={13} /> Level {level}
            </span>
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <h2 className="truncate text-2xl font-black sm:text-xl">@{username}</h2>


          <div className="mt-4 rounded-[1.75rem] border border-yellow-300/15 bg-gradient-to-br from-yellow-400/12 via-fuchsia-400/10 to-violet-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-yellow-100/65"><Crown size={14} /> XP Progress</p>
                <p className="mt-1 text-xl font-black text-white">{compactNumber(xp)} XP</p>
              </div>
              <div className="text-right text-xs font-bold text-white/45">
                <p>Next Level</p>
                <p className="text-white/75">{compactNumber(Math.max(0, nextLevelXp - xp))} XP kaldı</p>
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/35">
              <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-fuchsia-300 to-violet-300 transition-all" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <div className="mt-4 rounded-[1.75rem] border border-violet-300/10 bg-black/20 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200/55">Profile Editor</p>
                <h3 className="mt-1 text-lg font-black text-white">Profilini düzenle</h3>
              </div>
              <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black text-white/45">
                {usernameLocked ? `${cooldownDays} gün kaldı` : "7 günde 1 değişir"}
              </span>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Kullanıcı adı</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40 disabled:opacity-50"
                  value={form.username}
                  disabled={usernameLocked}
                  maxLength={20}
                  placeholder="Kullanıcı Adı"
                  onChange={(event) => setForm((prev) => ({ ...prev, username: sanitizeUsername(event.target.value) }))}
                />
                <div className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-bold ${usernameLocked ? "border-amber-300/20 bg-amber-400/10 text-amber-100/80" : "border-emerald-300/15 bg-emerald-400/10 text-emerald-100/75"}`}>
                  {usernameReminder}
                </div>
                <p className="mt-2 text-xs font-bold text-white/30">
                  Sadece harf, rakam ve nokta. Alt çizgi yok. Bio kaydı kullanıcı adı cooldown'undan etkilenmez.
                </p>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Biyografi</span>
                <textarea
                  className="mt-2 min-h-[110px] w-full resize-none rounded-[1.35rem] border border-white/10 bg-black/25 p-4 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
                  value={form.bio}
                  maxLength={180}
                  placeholder="Kendini kısaca anlat..."
                  onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                />
                <p className="mt-2 text-right text-xs font-bold text-white/30">{String(form.bio || "").length}/180</p>
              </label>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.02] disabled:opacity-60"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Kaydet
            </button>
          </div>

          <div className="mt-4 rounded-[1.75rem] border border-yellow-300/15 bg-gradient-to-br from-yellow-400/12 via-fuchsia-400/8 to-violet-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-100/75">
                  <Crown size={14} /> Creator Mode
                </div>
                <p className="mt-2 truncate text-sm font-black text-white">
                  {creatorProfile?.displayName || username} {creatorProfile?.category ? `• ${creatorProfile.category}` : ""}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-white/45">
                  {creatorProfile?.headline || "Featured rooms, followers ve creator event sistemi aktif."}
                </p>
              </div>
              <div className="shrink-0 rounded-2xl bg-black/25 px-3 py-2 text-right">
                <p className="text-sm font-black text-yellow-100">{compactNumber(followersCount)}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Followers</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.04] p-2">
                <p className="text-sm font-black text-white">{compactNumber(followingCount)}</p>
                <p className="text-[10px] font-bold text-white/35">Following</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-2">
                <p className="text-sm font-black text-white">{compactNumber(creatorProfile?.totalRoomsHosted || mergedStats.roomsJoined || 0)}</p>
                <p className="text-[10px] font-bold text-white/35">Hosted</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-2">
                <p className="text-sm font-black text-white">{compactNumber(creatorProfile?.totalWatchHours || Math.floor(Number(mergedStats.watchSeconds || 0) / 3600))}h</p>
                <p className="text-[10px] font-bold text-white/35">Watch</p>
              </div>
            </div>

            {creatorBadges.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {creatorBadges.slice(0, 4).map((badge) => (
                  <span key={badge} className="rounded-full bg-yellow-400/10 px-3 py-1 text-[10px] font-black text-yellow-100">
                    👑 {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3"><p className="text-xl font-black text-white sm:text-lg">{compactNumber(mergedStats?.roomsJoined)}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Rooms</p></div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3"><p className="text-xl font-black text-white sm:text-lg">{stats?.watchTime || "0h"}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Watch</p></div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3"><p className="text-xl font-black text-white sm:text-lg">{compactNumber(mergedStats?.friends)}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Friends</p></div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3"><p className="text-xl font-black text-white sm:text-lg">{compactNumber(mergedStats?.messagesSent)}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Msgs</p></div>
          </div>

          {bio ? (
            <div className="mt-4 rounded-3xl border border-white/8 bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/35"><UserRound size={13} /> Bio</div>
              <p className="text-sm font-bold leading-5 text-white/70">{bio}</p>
            </div>
          ) : null}


          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs font-black text-fuchsia-200">{badgeIcon(badge)} {badge}</span>
            ))}
          </div>


          {achievements.length ? (
            <div className="mt-4 rounded-3xl border border-yellow-300/10 bg-yellow-400/5 p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-100/60"><Trophy size={13} /> Achievement Gallery</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {achievements.slice(0, 8).map((achievement) => (
                  <div key={achievement.id || achievement.title} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-sm font-black text-white">{achievementIcon(achievement)} {achievement.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] font-bold text-white/38">{achievement.description || "+XP achievement unlocked"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </section>
  );
}
