import { Activity, Clock, Copy, MessageCircle, Monitor, Radio, UserPlus, Users, Video } from "lucide-react";
import toast from "react-hot-toast";

function getId(user) {
  return String(user?._id || user?.id || user?.userId || "");
}

function getPresenceStatus(user) {
  if (!user?.isOnline) {
    return {
      dot: "bg-white/20",
      badge: "bg-white/5 text-white/40 border-white/10",
      label: "Offline",
    };
  }

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
  if (!user?.isOnline) {
    return {
      icon: <Activity size={14} className="text-white/25" />,
      text: "Offline",
    };
  }

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

function getActivityFeedIcon(type) {
  if (type === "video") return <Video size={13} className="text-sky-300" />;
  if (type === "screen") return <Monitor size={13} className="text-fuchsia-300" />;
  if (type === "voice") return <Radio size={13} className="text-emerald-300" />;
  if (type === "invite") return <UserPlus size={13} className="text-violet-300" />;
  if (type === "room") return <Users size={13} className="text-violet-300" />;

  return <Activity size={13} className="text-white/35" />;
}

function getActivityTimeText(createdAt) {
  if (!createdAt) return "az önce";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - Number(createdAt)) / 1000));

  if (diffSeconds < 15) return "şimdi";
  if (diffSeconds < 60) return `${diffSeconds} sn önce`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours} sa önce`;
}

function getLastSeenText(updatedAt, isOnline) {
  if (!isOnline) return "offline";
  if (!updatedAt) return "az önce";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));

  if (diffSeconds < 15) return "şimdi";
  if (diffSeconds < 60) return `${diffSeconds} sn önce`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours} sa önce`;
}

function formatWatchProgress(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

function buildFriendActivity({ friends = [], onlineUsers = [], currentSocketId }) {
  const onlineByUserId = new Map();

  (onlineUsers || []).forEach((user) => {
    const userId = String(user?.userId || "");
    if (!userId || user?.socketId === currentSocketId) return;
    onlineByUserId.set(userId, user);
  });

  return (friends || [])
    .map((friend) => {
      const friendId = getId(friend);
      const online = onlineByUserId.get(friendId);

      return {
        ...friend,
        ...(online || {}),
        _id: friend?._id || friend?.id || friendId,
        userId: friendId,
        username: friend?.username || online?.username || "Kullanıcı",
        email: friend?.email || online?.email || "",
        avatar: friend?.avatar || online?.avatar || "",
        isOnline: !!online,
      };
    })
    .sort((a, b) => {
      if (Number(b.isOnline) !== Number(a.isOnline)) return Number(b.isOnline) - Number(a.isOnline);

      const priority = {
        "sharing-screen": 5,
        voice: 4,
        watching: 3,
        "in-room": 2,
        idle: 1,
      };

      const aPriority = priority[a.activity] || (a.roomCode ? 2 : 0);
      const bPriority = priority[b.activity] || (b.roomCode ? 2 : 0);

      if (bPriority !== aPriority) return bPriority - aPriority;
      if (!!b.roomCode !== !!a.roomCode) return Number(!!b.roomCode) - Number(!!a.roomCode);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
}

export default function PresenceFriendPanel({
  friendState,
  friends,
  onlineUsers = [],
  currentSocketId,
  currentRoomCode = "",
  activityFeed = [],
  inviteCooldowns = {},
  dmUnread = {},
  activeDM = null,
  dmLastMessages = {},
  onJoinRoom,
  onInviteFriend,
  onOpenDM,
}) {
  const friendList = friends || friendState?.friends || [];
  const users = buildFriendActivity({ friends: friendList, onlineUsers, currentSocketId });

  const onlineCount = users.filter((user) => user.isOnline).length;
  const watchingCount = users.filter((user) => user.isOnline && user.activity === "watching").length;
  const roomCount = users.filter((user) => user.isOnline && user.roomCode).length;
  const voiceCount = users.filter((user) => user.isOnline && (user.voiceActive || user.activity === "voice")).length;
  const visibleActivityFeed = (activityFeed || []).slice(0, 6);

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]" />
            <h2 className="text-lg font-black">Arkadaş Aktivitesi</h2>
          </div>
          <p className="mt-1 text-xs text-white/40">
            Sadece arkadaşların görünür: online, izliyor, voice, live ve offline.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
          <Users size={18} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3 text-center">
          <p className="text-base font-black text-white">{onlineCount}</p>
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
            Henüz arkadaş yok. Friend Requests bölümünden arkadaş ekle.
          </div>
        ) : (
          users.map((user) => {
            const activity = getActivityLabel(user);
            const presence = getPresenceStatus(user);
            const roomSummary = user.roomSummary;
            const sameRoom =
              !!user.roomCode &&
              !!currentRoomCode &&
              String(user.roomCode).toUpperCase() === String(currentRoomCode).toUpperCase();
            const inviteCooldownKey = user.userId || user._id || user.id || user.socketId;
            const inviteCooldownActive =
              Number(inviteCooldowns?.[inviteCooldownKey] || 0) > Date.now();
            const dmUserId = String(user.userId || user._id || user.id || "");
            const unreadCount = Number(dmUnread?.[dmUserId] || 0);
            const lastDM = dmLastMessages?.[dmUserId] || null;
            const isActiveDM =
              !!activeDM &&
              String(activeDM.userId || activeDM._id || activeDM.id || "") === dmUserId;

            return (
              <div
                key={user.userId || user.socketId}
                className={`group rounded-3xl border border-white/5 bg-black/25 p-4 transition hover:border-violet-300/20 hover:bg-white/[0.06] ${!user.isOnline ? "opacity-75" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${presence.dot}`} />
                      <p className="truncate text-sm font-black text-white">
                        {user.username || "Kullanıcı"}
                      </p>

                      {unreadCount > 0 ? (
                        <span className="rounded-full bg-fuchsia-500 px-2 py-1 text-[10px] font-black text-white shadow-[0_0_16px_rgba(217,70,239,0.45)]">
                          {Math.min(99, unreadCount)}
                        </span>
                      ) : null}

                      {isActiveDM ? (
                        <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-200">
                          DM Açık
                        </span>
                      ) : null}

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
                        {getLastSeenText(user.updatedAt, user.isOnline)}
                      </span>
                    </div>

                    {user.watchTitle ? (
                      <div className="mt-3 rounded-2xl border border-sky-300/10 bg-sky-400/5 px-3 py-2">
                        <p className="truncate text-xs font-black text-sky-200">
                          🎬 {user.watchTitle}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-white/45">
                          ⏱ {formatWatchProgress(user.watchTime)}
                        </p>
                      </div>
                    ) : null}

                    {lastDM?.message ? (
                      <div className="mt-3 rounded-2xl border border-sky-300/10 bg-sky-400/5 px-3 py-2 text-xs font-bold text-sky-100/65">
                        <span className="text-sky-200/90">Son mesaj:</span>{" "}
                        <span className="text-white/55">
                          {String(lastDM.message).length > 44
                            ? `${String(lastDM.message).slice(0, 44)}...`
                            : lastDM.message}
                        </span>
                      </div>
                    ) : null}

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
                        {sameRoom ? (
                          <div className="rounded-2xl bg-emerald-500/15 px-3 py-2 text-center text-xs font-black text-emerald-200">
                            Aynı Odada
                          </div>
                        ) : (
                          <button
                            className="rounded-2xl bg-violet-500/15 px-3 py-2 text-xs font-black text-violet-200 transition hover:bg-violet-500/25"
                            onClick={() => onJoinRoom?.(user.roomCode)}
                          >
                            Katıl
                          </button>
                        )}

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
                      className="inline-flex items-center justify-center gap-1 rounded-2xl bg-sky-500/15 px-3 py-2 text-xs font-black text-sky-200 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => onOpenDM?.(user)}
                      disabled={!onOpenDM}
                      title="Arkadaşına mesaj gönder"
                    >
                      <MessageCircle size={13} />
                      Mesaj
                    </button>

                    {sameRoom ? (
                      <button
                        className="rounded-2xl bg-white/8 px-3 py-2 text-xs font-black text-white/45 disabled:cursor-not-allowed"
                        disabled
                        title="Zaten aynı odadasınız"
                      >
                        Odada
                      </button>
                    ) : (
                      <button
                        className="rounded-2xl bg-fuchsia-500/15 px-3 py-2 text-xs font-black text-fuchsia-200 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => onInviteFriend?.(user)}
                        disabled={!user.isOnline || !user.socketId || !onInviteFriend || inviteCooldownActive}
                        title={
                          !user.isOnline
                            ? "Arkadaş offline"
                            : inviteCooldownActive
                              ? "Davet için biraz bekle"
                              : "Arkadaşını odana davet et"
                        }
                      >
                        {inviteCooldownActive ? "Bekle" : "Davet Et"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 rounded-3xl border border-white/5 bg-white/[0.04] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
            <Activity size={14} />
            Party Activity
          </div>
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black text-white/30">
            Live
          </span>
        </div>

        {visibleActivityFeed.length === 0 ? (
          <div className="rounded-2xl bg-black/20 px-3 py-3 text-xs text-white/35">
            Henüz aktivite yok. Odaya katılma, voice, screen share ve davet olayları burada akar.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleActivityFeed.map((activity) => (
              <div
                key={activity.id || `${activity.type}-${activity.createdAt}`}
                className="rounded-2xl bg-black/20 px-3 py-2"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-xl bg-white/8 p-1.5">
                    {getActivityFeedIcon(activity.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="truncate text-xs font-black text-white/75">
                        {activity.title || "Vory Activity"}
                      </p>
                      <span className="shrink-0 text-[10px] font-bold text-white/25">
                        {getActivityTimeText(activity.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs font-bold text-white/40">
                      {activity.message || "Yeni aktivite"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-3xl bg-white/[0.04] p-3 text-xs text-white/35">
        <div className="flex items-center gap-2">
          <UserPlus size={14} />
          Online arkadaşına katılabilir, linkini kopyalayabilir veya kendi odana davet edebilirsin.
        </div>
      </div>
    </section>
  );
}
