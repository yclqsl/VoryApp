import { useState } from "react";
import {
  Copy,
  Radio,
  Zap,
  Users,
  Crown,
  Lock,
  UserCheck,
  MicOff,
  MessageSquareOff,
} from "lucide-react";
import toast from "react-hot-toast";

export default function QuickActions({ roomCode, isHost, userCount = 0 }) {
  const [roomLocked, setRoomLocked] = useState(false);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [muteAll, setMuteAll] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);

  async function copyRoom() {
    if (!roomCode) {
      toast.error("Aktif oda yok.");
      return;
    }

    await navigator.clipboard.writeText(roomCode);
    toast.success("Oda kodu kopyalandı.");
  }

  const items = [
    {
      icon: Copy,
      label: "Oda Kodu",
      value: roomCode || "Oda yok",
      onClick: copyRoom,
      color: "text-violet-300",
    },
    {
      icon: Radio,
      label: "Durum",
      value: isHost ? "Host kontrolünde" : "İzleyici modu",
      color: "text-emerald-300",
    },
    {
      icon: Users,
      label: "Katılımcı",
      value: `${userCount} kişi`,
      color: "text-sky-300",
    },
    {
      icon: Crown,
      label: "Yetki",
      value: isHost ? "Host" : "Viewer",
      color: "text-yellow-300",
    },
  ];

  if (isHost) {
    items.push(
      {
        icon: Lock,
        label: "Room Lock",
        value: roomLocked ? "Enabled" : "Disabled",
        color: roomLocked ? "text-red-300" : "text-white/38",
        onClick: () => {
          const nextValue = !roomLocked;
          setRoomLocked(nextValue);
          toast.success(nextValue ? "Room locked 🔒" : "Room unlocked 🔓");
        },
      },
      {
        icon: UserCheck,
        label: "Invite Only",
        value: inviteOnly ? "Enabled" : "Disabled",
        color: inviteOnly ? "text-violet-300" : "text-white/38",
        onClick: () => {
          const nextValue = !inviteOnly;
          setInviteOnly(nextValue);
          toast.success(nextValue ? "Invite only enabled 👥" : "Invite only disabled 👥");
        },
      },
      {
        icon: MicOff,
        label: "Mute All",
        value: muteAll ? "Enabled" : "Disabled",
        color: muteAll ? "text-amber-300" : "text-white/38",
        onClick: () => {
          const nextValue = !muteAll;
          setMuteAll(nextValue);
          toast.success(nextValue ? "Everyone muted 🔇" : "Mute all disabled 🎤");
        },
      },
      {
        icon: MessageSquareOff,
        label: "Chat Lock",
        value: chatLocked ? "Enabled" : "Disabled",
        color: chatLocked ? "text-fuchsia-300" : "text-white/38",
        onClick: () => {
          const nextValue = !chatLocked;
          setChatLocked(nextValue);
          toast.success(nextValue ? "Chat locked 💬" : "Chat unlocked 💬");
        },
      }
    );
  }

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Oda Özeti</h2>
          <p className="text-xs text-white/35">
            {isHost ? "Host ayarları ve hızlı kontrol merkezi" : "Hızlı kontrol merkezi"}
          </p>
        </div>

        <div className="rounded-2xl bg-fuchsia-500/15 p-3 text-fuchsia-300">
          <Zap size={18} />
        </div>
      </div>

      {isHost && (
        <div className="mt-4 rounded-3xl border border-violet-400/15 bg-violet-500/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-200/60">
                Room Settings
              </p>
              <h3 className="mt-1 text-lg font-black text-white">
                Closed Beta Host Controls
              </h3>
            </div>

            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-black text-violet-200">
              HOST
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className="card-hover rounded-3xl border border-white/8 bg-white/7 p-4 text-left"
              onClick={item.onClick}
              type="button"
            >
              <Icon size={19} className={`mb-3 ${item.color}`} />
              <p className="text-sm font-black">{item.label}</p>
              <p className="mt-1 truncate text-xs text-white/38">{item.value}</p>
            </button>
          );
        })}
      </div>

      {isHost && (
        <p className="mt-4 rounded-3xl bg-white/[0.04] p-3 text-xs text-white/35">
          Bu ayarlar V12.6 mini sürümünde frontend toggle olarak çalışır. V12.6.1 ile socket/backend senkronu eklenecek.
        </p>
      )}
    </section>
  );
}
