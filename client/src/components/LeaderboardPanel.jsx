import { Crown, Flame, Medal, Trophy, Users } from "lucide-react";

function compactNumber(value = 0) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  return String(safeValue);
}

function rankIcon(rank) {
  if (rank === 1) return <Crown size={16} className="text-yellow-200" />;
  if (rank === 2) return <Medal size={16} className="text-white/70" />;
  if (rank === 3) return <Flame size={16} className="text-orange-200" />;
  return <Trophy size={16} className="text-violet-200" />;
}

export default function LeaderboardPanel({ users = [], loading = false, onRefresh }) {
  const topUsers = (users || []).slice(0, 10);

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-200" />
            <h2 className="text-lg font-black">Top Users</h2>
          </div>
          <p className="mt-1 text-xs text-white/40">XP, level ve activity score sıralaması.</p>
        </div>
        <button type="button" onClick={onRefresh} className="rounded-2xl bg-white/8 px-3 py-2 text-xs font-black text-white/60 transition hover:bg-white/12 hover:text-white">
          {loading ? "Yükleniyor..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {topUsers.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 text-sm text-white/40">
            Leaderboard için ilk XP kayıtları bekleniyor.
          </div>
        ) : (
          topUsers.map((user) => (
            <div key={user._id || user.username} className="flex items-center justify-between gap-3 rounded-3xl border border-white/5 bg-white/[0.04] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/25 text-sm font-black">
                  {rankIcon(user.rank)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black">#{user.rank} @{user.username}</p>
                  <p className="truncate text-xs font-bold text-white/38">
                    Level {user.profileLevel || 1} • {compactNumber(user.profileXp)} XP • {compactNumber(user.followersCount || user.followers?.length || 0)} Followers
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-1 rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-100 sm:flex">
                <Users size={13} /> {compactNumber(user.profileStats?.friends || 0)}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
