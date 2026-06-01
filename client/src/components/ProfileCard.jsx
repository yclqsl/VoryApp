import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

function Avatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className="h-16 w-16 rounded-3xl object-cover ring-2 ring-violet-300/20"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl font-black ring-2 ring-violet-300/20">
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfileCard({ authUser, onUserUpdate }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <section className="glass overflow-hidden p-0">
      <div className="h-20 bg-gradient-to-r from-violet-600/80 via-fuchsia-600/60 to-indigo-600/70" />

      <div className="-mt-8 p-4">
        <div className="flex items-end justify-between gap-4">
          <div className="relative">
            <Avatar user={authUser} />

            <button
              className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40 transition hover:scale-105"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Profil fotoğrafı değiştir"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => uploadAvatar(e.target.files?.[0])}
            />
          </div>

          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <ShieldCheck size={13} />
            Online
          </span>
        </div>

        <div className="mt-4 min-w-0">
          <h2 className="truncate text-xl font-black">@{authUser?.username}</h2>
          <p className="truncate text-sm text-white/40">{authUser?.email}</p>
        </div>
      </div>
    </section>
  );
}
