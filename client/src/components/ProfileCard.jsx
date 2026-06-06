import { Camera, Save, UserRound } from "lucide-react";
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

function Avatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className="h-20 w-20 rounded-[1.75rem] object-cover ring-2 ring-violet-300/35 shadow-[0_0_35px_rgba(139,92,246,0.18)]"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-3xl font-black ring-2 ring-violet-300/30">
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

  const username = profileProgress?.username || authUser?.username || "user";
  const email = profileProgress?.email || authUser?.email || "Vory kullanıcısı";
  const online = connectionStatus === "connected";
  const watchTime = stats?.watchTime || "0h";

  useEffect(() => {
    setForm({
      username: username || "",
      bio: profileProgress?.bio || authUser?.bio || "",
    });
  }, [username, profileProgress?.bio, authUser?.bio]);

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
    const cleanUsername = sanitizeUsername(form.username);
    if (!cleanUsername) {
      toast.error("Kullanıcı adı boş olamaz.");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("vory_token");
      const { data } = await api.patch(
        "/users/profile",
        { username: cleanUsername, bio: form.bio || "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data?.user) {
        localStorage.setItem("vory_user", JSON.stringify(data.user));
        onUserUpdate?.(data.user);
      }

      toast.success("Profil güncellendi.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Profil güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass overflow-hidden">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <Avatar user={{ ...authUser, username, avatar: profileProgress?.avatar || authUser?.avatar }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_14px_35px_rgba(124,58,237,0.35)]"
            disabled={loading}
            title="Avatar değiştir"
          >
            <Camera size={17} />
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-2xl font-black text-white">@{username}</h2>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${online ? "bg-emerald-400/12 text-emerald-200" : "bg-white/8 text-white/35"}`}>
              {online ? "Çevrimiçi" : "Offline"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-bold text-white/42">{email}</p>
          <p className="mt-2 text-sm font-bold text-white/55">
            {roomCode ? `Şu an oda: ${roomCode}` : "Vory watch party hesabı"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">Odalar</p>
          <p className="mt-2 text-2xl font-black text-white">{stats?.roomsJoined || 0}</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">İzleme</p>
          <p className="mt-2 text-2xl font-black text-white">{watchTime}</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">Arkadaş</p>
          <p className="mt-2 text-2xl font-black text-white">{stats?.friends || 0}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={form.username}
          onChange={(event) => setForm((prev) => ({ ...prev, username: sanitizeUsername(event.target.value) }))}
          className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
          placeholder="kullanıcı adı"
        />
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-black transition hover:scale-[1.02] disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Kaydediliyor" : "Kaydet"}
        </button>
      </div>

      <textarea
        value={form.bio}
        onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value.slice(0, 140) }))}
        className="mt-3 min-h-[92px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
        placeholder="Kısa profil açıklaması..."
      />
    </section>
  );
}
