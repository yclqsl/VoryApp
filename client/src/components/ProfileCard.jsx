import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

function Avatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className="h-16 w-16 rounded-3xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl font-black">
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
    <section className="glass">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar user={authUser} />

          <button
            className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg"
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

        <div className="min-w-0">
          <h2 className="truncate text-lg font-black">@{authUser?.username}</h2>
          <p className="truncate text-sm text-white/40">{authUser?.email}</p>
          <p className="mt-1 text-xs text-emerald-300">Çevrimiçi</p>
        </div>
      </div>
    </section>
  );
}
