import { Camera, Loader2, Save, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

function sanitizeUsername(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 20);
}

function compactNumber(value = 0) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  return String(safeValue);
}

function Avatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className="h-24 w-24 rounded-[2rem] border border-white/15 object-cover shadow-[0_20px_70px_rgba(0,0,0,0.4)]"
      />
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/15 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-4xl font-black text-white shadow-[0_20px_70px_rgba(0,0,0,0.4)]">
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
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

  const user = profileProgress || authUser || {};
  const username = user.username || authUser?.username || "user";
  const email = user.email || authUser?.email || "Vory user";
  const bio = user.bio || authUser?.bio || "";
  const online = connectionStatus === "connected";
  const friendsCount = Number(stats?.friends || 0);
  const roomsJoined = Number(stats?.roomsJoined || 0);
  const watchTime = stats?.watchTime || "0h";

  useEffect(() => {
    setForm({
      username: sanitizeUsername(username),
      bio: bio || "",
    });
  }, [username, bio]);

  async function uploadAvatar(file) {
    try {
      if (!file) return;
      const formData = new FormData();
      formData.append("avatar", file);
      setLoading(true);
      const { data } = await api.post("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.user) {
        localStorage.setItem("vory_user", JSON.stringify(data.user));
        onUserUpdate?.(data.user);
      }
      toast.success("Profil fotoğrafı güncellendi 📸");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Avatar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    const cleanUsername = sanitizeUsername(form.username);
    const cleanBio = String(form.bio || "").trim().slice(0, 180);

    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error("Kullanıcı adı en az 3 karakter olmalı.");
      return;
    }

    try {
      setSaving(true);
      const { data } = await api.patch("/users/profile/settings", {
        username: cleanUsername,
        bio: cleanBio,
      });

      const nextUser = data?.user || {
        ...(authUser || {}),
        username: cleanUsername,
        bio: cleanBio,
      };

      localStorage.setItem("vory_user", JSON.stringify(nextUser));
      onUserUpdate?.(nextUser);
      toast.success(data?.message || "Profil güncellendi.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <Avatar user={{ ...authUser, ...user }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white text-black shadow-2xl transition hover:scale-105 disabled:opacity-60"
            title="Profil fotoğrafı değiştir"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => uploadAvatar(event.target.files?.[0])}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-100/70">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-300" : "bg-white/25"}`} />
            {online ? "Online" : "Offline"}
          </div>
          <h2 className="mt-3 truncate text-3xl font-black text-white">@{username}</h2>
          <p className="mt-1 truncate text-sm font-bold text-white/38">{email}</p>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/55">
            {bio || "Henüz bio eklenmedi."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4 text-center">
          <p className="text-2xl font-black text-white">{compactNumber(roomsJoined)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Rooms</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4 text-center">
          <p className="text-2xl font-black text-white">{watchTime}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Watch</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4 text-center">
          <p className="text-2xl font-black text-white">{compactNumber(friendsCount)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">Friends</p>
        </div>
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
        <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/35">
          <UserRound size={14} /> Profile Editor
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Kullanıcı adı</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
              value={form.username}
              maxLength={20}
              placeholder="kullaniciadi"
              onChange={(event) => setForm((prev) => ({ ...prev, username: sanitizeUsername(event.target.value) }))}
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Biyografi</span>
            <textarea
              className="mt-2 min-h-[110px] w-full resize-none rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
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
    </section>
  );
}
