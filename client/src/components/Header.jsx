import { Crown, LogOut, Radio, Users } from "lucide-react";

function Avatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black ring-2 ring-white/10">
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
}

export default function Header({ authUser, onLogout, isHost, roomCode, userCount = 0 }) {
  return (
    <header className="glass-panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/30">
            <Radio size={21} />
          </div>

          <div>
            <h1 className="bg-gradient-to-r from-white via-violet-200 to-fuchsia-300 bg-clip-text text-2xl font-black text-transparent lg:text-3xl">
              VoryApp
            </h1>
            <p className="text-sm text-white/40">
              Watch together • Voice together
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {roomCode && (
          <div className="rounded-2xl bg-black/25 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              Aktif Oda
            </p>
            <p className="font-black text-emerald-300">{roomCode}</p>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-2xl bg-black/25 px-4 py-3 text-sm text-white/65">
          <Users size={16} className="text-violet-300" />
          {userCount} kişi
        </div>

        {isHost && (
          <div className="flex items-center gap-2 rounded-2xl bg-yellow-500/15 px-4 py-3 text-sm font-bold text-yellow-300">
            <Crown size={16} />
            Host
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2">
          <Avatar user={authUser} />
          <div className="min-w-0 text-right">
            <div className="truncate font-bold">@{authUser?.username}</div>
            <div className="text-xs text-emerald-400">Online</div>
          </div>
        </div>

        <button onClick={onLogout} className="btn-secondary mt-0 w-auto px-4">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
