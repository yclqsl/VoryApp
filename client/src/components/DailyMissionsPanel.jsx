import { CheckCircle2, Flame, Gift, RefreshCcw, Sparkles, Trophy } from "lucide-react";

function compactNumber(value = 0) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  return String(safeValue);
}

function fallbackMissions(stats = {}) {
  return [
    {
      id: "watch-30-min",
      icon: "🎬",
      title: "30 dk izle",
      description: "Bugün toplam 30 dakika watch party yap.",
      xpReward: 50,
      target: 1800,
      progress: Number(stats.watchSeconds || 0),
      completed: Number(stats.watchSeconds || 0) >= 1800,
      claimed: false,
    },
    {
      id: "send-10-messages",
      icon: "💬",
      title: "10 mesaj gönder",
      description: "Bugün sohbeti canlandır.",
      xpReward: 40,
      target: 10,
      progress: Number(stats.messagesSent || 0),
      completed: Number(stats.messagesSent || 0) >= 10,
      claimed: false,
    },
    {
      id: "use-5-reactions",
      icon: "🔥",
      title: "5 reaction kullan",
      description: "Odaya hype kat.",
      xpReward: 35,
      target: 5,
      progress: Number(stats.reactionsUsed || 0),
      completed: Number(stats.reactionsUsed || 0) >= 5,
      claimed: false,
    },
    {
      id: "join-room",
      icon: "🚀",
      title: "1 odaya katıl",
      description: "Bir watch party odasına gir.",
      xpReward: 45,
      target: 1,
      progress: Number(stats.roomsJoined || 0),
      completed: Number(stats.roomsJoined || 0) >= 1,
      claimed: false,
    },
    {
      id: "invite-friend",
      icon: "👥",
      title: "1 davet gönder",
      description: "Bir arkadaşını partiye çağır.",
      xpReward: 75,
      target: 1,
      progress: Number(stats.invitesSent || 0),
      completed: Number(stats.invitesSent || 0) >= 1,
      claimed: false,
    },
  ];
}

export default function DailyMissionsPanel({
  profileProgress = null,
  stats = {},
  loading = false,
  onRefresh,
  onClaimMission,
}) {
  const missions = profileProgress?.dailyMissions?.missions?.length
    ? profileProgress.dailyMissions.missions
    : fallbackMissions(stats);

  const completedCount = missions.filter((mission) => mission.completed).length;
  const claimedCount = missions.filter((mission) => mission.claimed).length;
  const totalXp = missions.reduce((sum, mission) => sum + Number(mission.xpReward || 0), 0);

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-200" />
            <h2 className="text-lg font-black">Daily Missions</h2>
          </div>
          <p className="mt-1 text-xs text-white/40">
            Her gün görevleri tamamla, XP topla ve achievement aç.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-2xl bg-white/8 px-3 py-2 text-xs font-black text-white/60 transition hover:bg-white/12 hover:text-white"
        >
          {loading ? "Sync..." : <span className="inline-flex items-center gap-1"><RefreshCcw size={13} /> Sync</span>}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/5 p-3 text-center">
          <p className="text-base font-black text-emerald-200">{completedCount}/{missions.length}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Done</p>
        </div>
        <div className="rounded-2xl border border-yellow-300/10 bg-yellow-400/5 p-3 text-center">
          <p className="text-base font-black text-yellow-100">{compactNumber(totalXp)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">XP Pool</p>
        </div>
        <div className="rounded-2xl border border-violet-300/10 bg-violet-400/5 p-3 text-center">
          <p className="text-base font-black text-violet-100">{claimedCount}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Claimed</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {missions.map((mission) => {
          const progress = Math.min(100, Math.round((Number(mission.progress || 0) / Math.max(1, Number(mission.target || 1))) * 100));
          const canClaim = mission.completed && !mission.claimed;

          return (
            <div key={mission.id} className="rounded-3xl border border-white/5 bg-white/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mission.icon || "🏆"}</span>
                    <p className="truncate font-black">{mission.title}</p>
                    {mission.completed ? <CheckCircle2 size={15} className="text-emerald-300" /> : null}
                  </div>
                  <p className="mt-1 text-xs font-bold text-white/38">{mission.description}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] font-black text-white/35">
                    {compactNumber(mission.progress)} / {compactNumber(mission.target)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canClaim}
                  onClick={() => onClaimMission?.(mission)}
                  className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black transition ${
                    mission.claimed
                      ? "bg-emerald-400/10 text-emerald-200"
                      : canClaim
                        ? "bg-yellow-400/20 text-yellow-100 hover:bg-yellow-400/30 active:scale-95"
                        : "bg-white/5 text-white/25"
                  }`}
                >
                  {mission.claimed ? (
                    <span className="inline-flex items-center gap-1"><Trophy size={13} /> Alındı</span>
                  ) : canClaim ? (
                    <span className="inline-flex items-center gap-1"><Gift size={13} /> +{mission.xpReward} XP</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><Sparkles size={13} /> Devam</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
