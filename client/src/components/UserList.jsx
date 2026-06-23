import { Crown, Mic, MicOff, Users } from "lucide-react";

function UserAvatar({ user, inVoice = false }) {
  if (user.avatar) {
    return (
      <div className="relative">
        <img
          src={user.avatar}
          alt="avatar"
          className="h-10 w-10 rounded-2xl object-cover ring-2 ring-white/10"
        />
        <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#11111a] ${inVoice ? "bg-emerald-400" : "bg-white/25"}`} />
      </div>
    );
  }

  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black ring-2 ring-white/10">
      {(user.username || "M").charAt(0).toUpperCase()}
      <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#11111a] ${inVoice ? "bg-emerald-400" : "bg-white/25"}`} />
    </div>
  );
}

export default function UserList({ users = [], voiceUsers = [] }) {
  return (
    <section className="vory-userlist-premium glass rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Party People</h2>
          <p className="text-xs text-white/35">Rave tarzı canlı oda katılımcıları</p>
        </div>

        <span className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-white/45">
          <Users size={13} />
          {users.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {users.length === 0 ? (
          <p className="rounded-2xl bg-black/25 p-3 text-sm text-white/35">
            Henüz odada kimse yok.
          </p>
        ) : (
          users.map((user) => {
            const voiceUser = (voiceUsers || []).find((item) => item.socketId === user.id || item.userId === user.userId);
            const inVoice = !!voiceUser;
            const muted = !!voiceUser?.muted;

            return (
              <div
                key={user.id}
                className="vory-user-row-549 card-hover flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-black/25 p-2.5"
              >
                <UserAvatar user={user} inVoice={inVoice} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{user.username}</p>
                    {user.isHost && (
                      <span className="flex items-center gap-1 rounded-full bg-yellow-400/15 px-2.5 py-1 text-[10px] font-bold text-yellow-300">
                        <Crown size={12} />
                        Host
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-white/40">
                    {inVoice ? (muted ? "Voice • muted" : "Voice • active") : "Watching"}
                  </p>
                </div>

                {inVoice ? (
                  muted ? <MicOff size={16} className="text-white/35" /> : <Mic size={16} className="text-emerald-300" />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
