import { Crown, Users } from "lucide-react";

function UserAvatar({ user }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt="avatar"
        className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white/10"
      />
    );
  }

  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black ring-2 ring-white/10">
      {(user.username || "M").charAt(0).toUpperCase()}
      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#11111a] bg-emerald-400" />
    </div>
  );
}

export default function UserList({ users }) {
  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Odadakiler</h2>
          <p className="text-xs text-white/35">Canlı oda katılımcıları</p>
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
          users.map((user) => (
            <div
              key={user.id}
              className="card-hover flex items-center gap-3 rounded-3xl bg-black/25 p-3"
            >
              <UserAvatar user={user} />

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{user.username}</p>
                <p className="text-xs text-white/40">
                  {user.isHost ? "Oda sahibi" : "İzleyici"}
                </p>
              </div>

              {user.isHost && (
                <span className="flex items-center gap-1 rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-bold text-yellow-300">
                  <Crown size={13} />
                  Host
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
