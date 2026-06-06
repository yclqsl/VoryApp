import { useEffect, useState } from "react";
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
import { socket } from "../services/socket";

const defaultSettings = {
  roomLocked: false,
  inviteOnly: false,
  muteAll: false,
  chatLocked: false,
};

export default function QuickActions({ roomCode, isHost, userCount = 0 }) {
  const [roomSettings, setRoomSettings] = useState(defaultSettings);

  useEffect(() => {
    function handleRoomSettingsUpdated(payload) {
      if (!payload?.settings) return;
      if (payload.roomCode && roomCode && payload.roomCode !== roomCode) return;

      setRoomSettings({
        roomLocked: !!payload.settings.roomLocked,
        inviteOnly: !!payload.settings.inviteOnly,
        muteAll: !!payload.settings.muteAll,
        chatLocked: !!payload.settings.chatLocked,
      });
    }

    function handleMuteAll(payload) {
      if (payload?.roomCode && roomCode && payload.roomCode !== roomCode) return;
      toast("Host herkesi susturdu 🔇", { icon: "🔇" });
    }

    socket.on("room-settings-updated", handleRoomSettingsUpdated);
    socket.on("room-mute-all", handleMuteAll);

    return () => {
      socket.off("room-settings-updated", handleRoomSettingsUpdated);
      socket.off("room-mute-all", handleMuteAll);
    };
  }, [roomCode]);

  async function copyRoom() {
    if (!roomCode) {
      toast.error("Aktif oda yok.");
      return;
    }

    await navigator.clipboard.writeText(roomCode);
    toast.success("Oda kodu kopyalandı.");
  }

  function updateSetting(key) {
    if (!roomCode) {
      toast.error("Önce oda oluştur veya odaya gir.");
      return;
    }

    if (!isHost) {
      toast.error("Bu ayarları sadece host değiştirebilir.");
      return;
    }

    const nextSettings = {
      ...roomSettings,
      [key]: !roomSettings[key],
    };

    setRoomSettings(nextSettings);

    socket.emit("room-settings-update", {
      roomCode,
      settings: nextSettings,
    });

    const enabled = nextSettings[key];

    const labels = {
      roomLocked: enabled ? "Oda kilitlendi 🔒" : "Oda kilidi açıldı 🔓",
      inviteOnly: enabled ? "Davetli mod açıldı 👥" : "Davetli mod kapandı 👥",
      muteAll: enabled ? "Herkes susturuldu 🔇" : "Mikrofonlar açıldı 🎤",
      chatLocked: enabled ? "Sohbet kilitlendi 💬" : "Sohbet açıldı 💬",
    };

    toast.success(labels[key] || "Room setting updated");
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
        label: "Oda Kilidi",
        value: roomSettings.roomLocked ? "Enabled" : "Disabled",
        color: roomSettings.roomLocked ? "text-red-300" : "text-white/38",
        onClick: () => updateSetting("roomLocked"),
      },
      {
        icon: UserCheck,
        label: "Davetli",
        value: roomSettings.inviteOnly ? "Enabled" : "Disabled",
        color: roomSettings.inviteOnly ? "text-violet-300" : "text-white/38",
        onClick: () => updateSetting("inviteOnly"),
      },
      {
        icon: MicOff,
        label: "Herkesi Sustur",
        value: roomSettings.muteAll ? "Enabled" : "Disabled",
        color: roomSettings.muteAll ? "text-amber-300" : "text-white/38",
        onClick: () => updateSetting("muteAll"),
      },
      {
        icon: MessageSquareOff,
        label: "Sohbet Kilidi",
        value: roomSettings.chatLocked ? "Enabled" : "Disabled",
        color: roomSettings.chatLocked ? "text-fuchsia-300" : "text-white/38",
        onClick: () => updateSetting("chatLocked"),
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
                Oda Ayarları
              </p>
              <h3 className="mt-1 text-lg font-black text-white">
                Closed Beta Host Controls
              </h3>
            </div>

            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-black text-violet-200">
              LIVE
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
          Oda Kilidi ve Davetli yeni katılımları engeller. Sohbet Kilidi viewer mesajlarını engeller.
          Herkesi Sustur şu an odadaki herkese mute sinyali gönderir; V13.0.3 ile VoiceChat seviyesinde mikrofon kapatma zorlaması eklenecek.
        </p>
      )}
    </section>
  );
}
