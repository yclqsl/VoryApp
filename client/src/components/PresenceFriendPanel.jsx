import { Activity, Clock, Copy, Monitor, Radio, UserPlus, Users, Video } from "lucide-react";
import toast from "react-hot-toast";

function getPresenceStatus(user) {
  if (user.screenSharing || user.activity === "sharing-screen") {
    return {
      dot: "bg-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,0.85)]",
      badge: "bg-fuchsia-400/10 text-fuchsia-200 border-fuchsia-300/15",
      label: "Live",
    };
  }

  if (user.voiceActive || user.activity === "voice") {
    return {
      dot: "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]",
      badge: "bg-emerald-400/10 text-emerald-200 border-emerald-300/15",
      label: "Voice",
    };
  }

  if (user.activity === "watching") {
    return {
      dot: "bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.85)]",
      badge: "bg-sky-400/10 text-sky-200 border-sky-300/15",
      label: "Watching",
    };
  }

  if (user.activity === "in-room" || user.roomCode) {
    return {
      dot: "bg-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.85)]",
      badge: "bg-violet-400/10 text-violet-200 border-violet-300/15",
      label: "In Room",
    };
  }

  return {
    dot: "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]",
    badge: "bg-white/5 text-white/55 border-white/10",
    label: "Online",
  };
}

function getActivityLabel(user) {
  if (user.screenSharing || user.activity === "sharing-screen") {
    return {
      icon: <Monitor size={14} className="text-fuchsia-300" />,
      text: "Ekran paylaşıyor",
    };
  }

  if (user.voiceActive || user.activity === "voice") {
    return {
      icon: <Radio size={14} className="text-emerald-300" />,
      text: "Sesli sohbette",
    };
  }

  if (user.activity === "watching") {
    return {
      icon: <Video size={14} className="text-sky-300" />,
      text: "Video izliyor",
    };
  }

  if (user.activity === "in-room" || user.roomCode) {
    return {
      icon: <Users size={14} className="text-violet-300" />,
      text: "Odada bekliyor",
    };
  }

  return {
    icon: <Activity size={14} className="text-white/35" />,
    text: "Online",
  };
}

function getLastSeenText(updatedAt) {
  if (!updatedAt) return "az önce";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));

  if (diffSeconds < 15) return "şimdi";
  if (diffSeconds < 60) return `${diffSeconds} sn önce`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours} sa önce`;
}

async function copyRoomLink(roomCode) {
  if (!roomCode) return;

  const roomLink = `${window.location.origin}/room/${roomCode}`;

  try {
    await navigator.clipboard.writeText(roomLink);
    toast.success("Oda linki kopyalandı 🔗");
  } catch (error) {
    toast.error("Link kopyalanamadı.");
  }
}

export default function PresenceFriendPanel({ onlineUsers = [], currentSocketId, onJoinRoom, onInviteFriend }) {
  const users = onlineUsers
    .filter((user) => user?.socketId && user.socketId !== currentSocketId)
    .sort((a, b) => {
      const priority = {
        "sharing-screen": 5,
        voice: 4,
        watching: 3,
        "in-room": 2,
        idle: 1,
      };

      const aPriority = priority[a.activity] || (a.roomCode ? 2 : 1);
      const bPriority = priority[b.activity] || (b.roomCode ? 2 : 1);

      if (bPriority !== aPriority) return bPriority - aPriority;
      if (!!b.roomCode !== !!a.roomCode) return Number(!!b.roomCode) - Number(!!a.roomCode);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  const watchingCount = users.filter((user) => user.activity === "watching").length;
  const roomCount = users.filter((user) => user.roomCode).length;
  const voiceCount = users.filter((user) => user.voiceActive || user.activity === "voice").length;

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]" />
            <h2 className="text-lg font-black">Arkadaş Aktivitesi</h2>
          </div>
          <p className="mt-1 text-xs text-white/40">
            Online, izliyor, voice ve live durumları.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
          <Users size={18} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3 text-center">
          <p className="text-base font-black text-white">{users.length}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Online</p>
        </div>
        <div className="rounded-2xl border border-sky-300/10 bg-sky-400/5 p-3 text-center">
          <p className="text-base font-black text-sky-200">{watchingCount}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Watching</p>
        </div>
        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/5 p-3 text-center">
          <p className="text-base font-black text-emerald-200">{voiceCount || roomCount}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Active</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {users.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 text-sm text-white/40">
            Şu an başka online kullanıcı görünmüyor.
          </div>
        ) : (
          users.map((user) => {
            const activity = getActivityLabel(user);
            const presence = getPresenceStatus(user);
            const roomSummary = user.roomSummary;

            return (
              <div
                key={user.socketId}
                className="group rounded-3xl border border-white/5 bg-black/25 p-4 transition hover:border-violet-300/20 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${presence.dot}`} />
                      <p className="truncate text-sm font-black text-white">
                        {user.username || "Kullanıcı"}
                      </p>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${presence.badge}`}>
                        {presence.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-white/55">
                      {activity.icon}
                      <span>{activity.text}</span>
                      <span className="text-white/20">•</span>
                      <span className="inline-flex items-center gap-1 text-white/35">
                        <Clock size={12} />
                        {getLastSeenText(user.updatedAt)}
                      </span>
                    </div>

                    {user.roomCode && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/35">
                        <span className="rounded-full bg-white/8 px-2.5 py-1">
                          Room: {user.roomCode}
                        </span>

                        {roomSummary?.userCount ? (
                          <span className="rounded-full bg-white/8 px-2.5 py-1">
                            👥 {roomSummary.userCount}
                          </span>
                        ) : null}

                        {roomSummary?.voiceCount ? (
                          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                            🎤 {roomSummary.voiceCount}
                          </span>
                        ) : null}

                        {roomSummary?.screenSharing ? (
                          <span className="rounded-full bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">
                            📺 Live
                          </span>
                        ) : null}

                        {roomSummary?.videoActive ? (
                          <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-sky-300">
                            🎬 Video
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {user.roomCode && (
                      <>
                        <button
                          className="rounded-2xl bg-violet-500/15 px-3 py-2 text-xs font-black text-violet-200 transition hover:bg-violet-500/25"
                          onClick={() => onJoinRoom?.(user.roomCode)}
                        >
                          Katıl
                        </button>

                        <button
                          className="inline-flex items-center justify-center gap-1 rounded-2xl bg-white/8 px-3 py-2 text-xs font-black text-white/65 transition hover:bg-white/12"
                          onClick={() => copyRoomLink(user.roomCode)}
                        >
                          <Copy size={13} />
                          Link
                        </button>
                      </>
                    )}

                    <button
                      className="rounded-2xl bg-fuchsia-500/15 px-3 py-2 text-xs font-black text-fuchsia-200 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => onInviteFriend?.(user)}
                      disabled={!onInviteFriend}
                    >
                      Davet Et
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 rounded-3xl bg-white/[0.04] p-3 text-xs text-white/35">
        <div className="flex items-center gap-2">
          <UserPlus size={14} />
          Odadaki arkadaşına katılabilir, linkini kopyalayabilir veya kendi odana davet edebilirsin.
        </div>
      </div>
    </section>
  );
}
