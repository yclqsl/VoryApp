import { Crown, LogOut } from "lucide-react";

function Avatar({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt="avatar" className="h-10 w-10 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">
      {(user?.username || "V").charAt(0).toUpperCase()}
    </div>
  );
}

export default function Header({ authUser, onLogout, isHost }) {
  return (
    <header className="glass flex items-center justify-between">
      <div>
        <h1 className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-3xl font-black text-transparent">
          VoryApp
        </h1>
        <p className="text-sm text-white/40">Watch together. Chat together.</p>
      </div>

      <div className="flex items-center gap-4">
        {isHost && (
          <div className="flex items-center gap-2 rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300">
            <Crown size={16} />
            Host
          </div>
        )}

        <div className="flex items-center gap-3 rounded-full bg-black/30 px-3 py-2">
          <Avatar user={authUser} />
          <div className="text-right">
            <div className="font-semibold">@{authUser?.username}</div>
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
