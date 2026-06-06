import { Camera, Save, UserRound } from "lucide-react";
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

function Avatar({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt="avatar" className="h-20 w-20 rounded-[1.75rem] object-cover ring-2 ring-violet-300/35" />;
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl font-black ring-2 ring-violet-300/35">
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfileCard({ authUser, onUserUpdate, roomCode = "", connectionStatus = "unknown" }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "" });

  const username = authUser?.username || "user";
  const email = authUser?.email || "Vory user";
  const online = connectionStatus === "connected";
  const usernameCooldown = daysUntilUsernameChange(authUser?.usernameChangedAt);
  const canChangeUsername = usernameCooldown <= 0;

  useEffect(() => {
    setForm({ username, bio: authUser?.bio || "" });
  }, [username, authUser?.bio]);

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
      const cleanUsername = sanitizeUsername(form.username);
      if (!cleanUsername || cleanUsername.length < 3) {
        toast.error("Kullanıcı adı en az 3 karakter olmalı.");
        return;
      }

      const token = localStorage.getItem("vory_token");
      setSaving(true);
      const { data } = await api.patch(
        "/users/profile",
        { username: cleanUsername, bio: form.bio?.slice(0, 120) || "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem("vory_user", JSON.stringify(data.user));
      onUserUpdate?.(data.user);
      toast.success("Profil güncellendi.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <Avatar user={authUser} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-xl"
            disabled={loading}
          >
            <Camera size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-200/55">Profil</p>
          <h2 className="mt-1 truncate text-3xl font-black text-white">@{username}</h2>
          <p className="mt-1 truncate text-sm font-bold text-white/40">{email}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
            <span className={`rounded-full px-3 py-1 ${online ? "bg-emerald-400/12 text-emerald-200" : "bg-white/8 text-white/45"}`}>{online ? "Çevrimiçi" : "Offline"}</span>
            <span className="rounded-full bg-violet-500/12 px-3 py-1 text-violet-100">{roomCode ? `Room ${roomCode}` : "Lobby"}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/35">Kullanıcı adı</span>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <UserRound size={16} className="text-white/35" />
            <input
              value={form.username}
              disabled={!canChangeUsername}
              onChange={(e) => setForm((prev) => ({ ...prev, username: sanitizeUsername(e.target.value) }))}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none disabled:text-white/35"
            />
          </div>
          {!canChangeUsername ? <span className="text-xs font-bold text-white/35">Kullanıcı adını {usernameCooldown} gün sonra değiştirebilirsin.</span> : null}
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/35">Bio</span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value.slice(0, 120) }))}
            placeholder="Kısa bir bio yaz..."
            className="min-h-[96px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25"
          />
        </label>

        <button type="button" onClick={saveProfile} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:scale-[1.01] disabled:opacity-60">
          <Save size={16} /> {saving ? "Kaydediliyor..." : "Profili Kaydet"}
        </button>
      </div>
    </section>
  );
}
