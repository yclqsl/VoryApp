import {
  Camera,
  Clock3,
  PlayCircle,
  Film,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import WatchHistory from "./WatchHistory";

function Avatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className="h-20 w-20 rounded-[1.75rem] object-cover ring-2 ring-violet-300/25 sm:h-16 sm:w-16 sm:rounded-3xl"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl font-black ring-2 ring-violet-300/25 sm:h-16 sm:w-16 sm:rounded-3xl sm:text-2xl">
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
}

function compactNumber(value = 0) {
  const safeValue = Math.max(0, Number(value) || 0);

  if (safeValue >= 1000) {
    return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  }

  return String(safeValue);
}

function formatPlaybackTime(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getProfileLevel(stats = {}) {
  const rooms = Number(stats?.roomsJoined || 0);
  const media = Number(stats?.mediaPlayed || 0);
  const messages = Number(stats?.messagesSent || 0);
  const reactions = Number(stats?.reactionsUsed || 0);
  const watchSeconds = Number(stats?.watchSeconds || 0);

  const score = rooms * 8 + media * 5 + messages * 2 + reactions + Math.floor(watchSeconds / 600);
  return Math.max(1, Math.floor(score / 35) + 1);
}

function getDefaultPlatforms(platforms = []) {
  const cleanPlatforms = (platforms || []).filter(Boolean).slice(0, 4);

  if (cleanPlatforms.length) return cleanPlatforms;

  return ["YouTube", "Watch Party", "Voice", "Screen Share"];
}

export default function ProfileCard({
  authUser,
  onUserUpdate,
  roomCode = "",
  connectionStatus = "unknown",
  stats,
  watchHistory = [],
  continueWatching = null,
  onResumeWatch,
}) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function uploadAvatar(file) {
    try {
      if (!file) return;

      const formData = new FormData();
      formData.append("avatar", file);

      const token = localStorage.getItem("vory_token");

      setLoading(true);

      const { data } = await api.post("/users/avatar", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
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

  const username = authUser?.username || "user";
  const email = authUser?.email || "Closed beta user";
  const online = connectionStatus === "connected";
  const level = getProfileLevel(stats);
  const platforms = getDefaultPlatforms(authUser?.favoritePlatforms);
  const badges = authUser?.profileBadges?.length
    ? authUser.profileBadges
    : ["Closed Beta Tester", "Vory Explorer"];

  const profileStatus = authUser?.statusMessage
    ? authUser.statusMessage
    : roomCode
      ? `Room ${roomCode} içinde aktif.`
      : online
        ? "Lobby'de online. Oda oluştur veya arkadaşına katıl."
        : "Bağlantı bekleniyor.";

  const bio = authUser?.bio?.trim()
    ? authUser.bio.trim()
    : "VoryApp beta kullanıcısı. Watch party, voice chat ve arkadaş sistemiyle takılıyor.";

  const canContinueWatching = !!continueWatching?.url;
  const continueTime = Number(continueWatching?.currentTime || 0);
  const compactHistory = historyOpen ? watchHistory : (watchHistory || []).slice(0, 3);
  const hiddenHistoryCount = Math.max(0, (watchHistory || []).length - 3);

  return (
    <section className="glass overflow-hidden p-0">
      <div className="relative h-20 bg-gradient-to-r from-violet-600/80 via-fuchsia-600/60 to-indigo-600/70 sm:h-24">
        <div className="absolute right-4 top-4 rounded-full bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 backdrop-blur-xl sm:text-xs">
          V13.7 Mobile Profile
        </div>
      </div>

      <div className="-mt-10 p-4 sm:-mt-8">
        <div className="flex items-end justify-between gap-4">
          <div className="relative">
            <Avatar user={authUser} />

            <button
              className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40 transition hover:scale-105 disabled:opacity-60 sm:h-9 sm:w-9"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Profil fotoğrafı değiştir"
              type="button"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => uploadAvatar(event.target.files?.[0])}
            />
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                online
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/10 text-white/40"
              }`}
            >
              <ShieldCheck size={13} />
              {online ? "Online" : "Offline"}
            </span>

            <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-black text-yellow-200">
              <Trophy size={13} />
              Level {level}
            </span>
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <h2 className="truncate text-2xl font-black sm:text-xl">@{username}</h2>
          <p className="truncate text-sm text-white/40">{email}</p>

          {canContinueWatching ? (
            <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-emerald-300/15 bg-gradient-to-br from-emerald-400/15 to-sky-400/10 p-4 shadow-[0_18px_70px_rgba(16,185,129,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
                    <PlayCircle size={14} />
                    Continue Watching
                  </div>
                  <p className="mt-3 line-clamp-2 text-base font-black leading-5 text-white sm:truncate sm:text-sm">
                    {continueWatching.title || continueWatching.url}
                  </p>
                  <p className="mt-2 text-xs font-bold text-white/50">
                    ⏱ {continueTime > 5 ? formatPlaybackTime(continueTime) : "Başlangıç"}
                    {continueWatching.roomCode || continueWatching.meta ? ` • ${continueWatching.roomCode || continueWatching.meta}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onResumeWatch?.(continueWatching)}
                  className="shrink-0 rounded-2xl bg-emerald-400/20 px-4 py-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-400/30 active:scale-95"
                >
                  Devam Et
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3">
              <p className="text-xl font-black text-white sm:text-lg">{compactNumber(stats?.roomsJoined)}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Rooms</p>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3">
              <p className="text-xl font-black text-white sm:text-lg">{stats?.watchTime || "0h"}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Watch</p>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3">
              <p className="text-xl font-black text-white sm:text-lg">{compactNumber(stats?.friends)}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Friends</p>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-center sm:rounded-2xl sm:p-3">
              <p className="text-xl font-black text-white sm:text-lg">{compactNumber(stats?.messagesSent)}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Msgs</p>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/8 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/35">
              <UserRound size={13} />
              Bio
            </div>
            <p className="text-sm font-bold leading-5 text-white/70">{bio}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {badges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs font-black text-fuchsia-200"
              >
                🧪 {badge}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-3xl border border-violet-400/10 bg-violet-500/10 p-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200/55">
              Profile Status
            </p>
            <p className="mt-1 text-sm font-bold text-white/70">{profileStatus}</p>
          </div>

          <div className="mt-4 rounded-3xl border border-sky-300/10 bg-sky-400/5 p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-sky-200/55">
              <Sparkles size={13} />
              Favorites
            </div>

            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1 rounded-full bg-white/8 px-3 py-1 text-xs font-black text-white/65"
                >
                  {platform.toLowerCase().includes("youtube") ? <Film size={12} /> : <Clock3 size={12} />}
                  {platform}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/35">
                <Clock3 size={13} />
                Watch History
              </div>

              {hiddenHistoryCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setHistoryOpen((value) => !value)}
                  className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black text-white/55 transition hover:bg-white/12 hover:text-white"
                >
                  {historyOpen ? "Kısalt" : `+${hiddenHistoryCount} daha`}
                </button>
              ) : null}
            </div>

            <WatchHistory
              items={compactHistory}
              stats={stats}
              onResumeWatch={onResumeWatch}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
