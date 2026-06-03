import { Activity, Monitor, Radio, UserPlus, Users, Video } from "lucide-react";

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
      text: "Odada",
    };
  }

  return {
    icon: <Activity size={14} className="text-white/35" />,
    text: "Online",
  };
}

export default function PresenceFriendPanel({ onlineUsers = [], currentSocketId, onJoinRoom, onInviteFriend }) {
  const users = onlineUsers
    .filter((user) => user?.socketId && user.socketId !== currentSocketId)
    .sort((a, b) => {
      if (!!b.roomCode !== !!a.roomCode) return Number(!!b.roomCode) - Number(!!a.roomCode);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Arkadaş Aktivitesi</h2>
          <p className="mt-1 text-xs text-white/40">
            Online, oda ve canlı aktivite durumu.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
          <Users size={18} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {users.length === 0 ? (
          <div className="rounded-3xl bg-black/25 p-4 text-sm text-white/40">
            Şu an başka online kullanıcı görünmüyor.
          </div>
        ) : (
          users.map((user) => {
            const activity = getActivityLabel(user);
            const roomSummary = user.roomSummary;

            return (
              <div
                key={user.socketId}
                className="rounded-3xl border border-white/5 bg-black/25 p-4 transition hover:border-white/10 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                      <p className="truncate text-sm font-black text-white">
                        {user.username || "Kullanıcı"}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-white/55">
                      {activity.icon}
                      <span>{activity.text}</span>
                    </div>

                    {user.roomCode && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/35">
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
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {user.roomCode && (
                      <button
                        className="rounded-2xl bg-violet-500/15 px-3 py-2 text-xs font-black text-violet-200 transition hover:bg-violet-500/25"
                        onClick={() => onJoinRoom?.(user.roomCode)}
                      >
                        Katıl
                      </button>
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
          Odada olan arkadaşına tek tıkla katılabilirsin.
        </div>
      </div>
    </section>
  );
}
