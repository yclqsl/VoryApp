function UserAvatar({ user }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="avatar" className="h-10 w-10 rounded-full object-cover" />;
  }

  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">
      {(user.username || "M").charAt(0).toUpperCase()}
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#11111a] bg-emerald-400" />
    </div>
  );
}

export default function UserList({ users }) {
  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Odadakiler</h2>
        <span className="text-sm text-white/40">{users.length} kişi</span>
      </div>

      <div className="mt-4 space-y-3">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 rounded-2xl bg-black/35 p-3">
            <UserAvatar user={user} />

            <div className="flex-1">
              <p className="font-bold">{user.username}</p>
              <p className="text-xs text-white/40">{user.isHost ? "Host" : "İzleyici"}</p>
            </div>

            {user.isHost && (
              <span className="rounded-full bg-yellow-400/15 px-3 py-1 text-xs text-yellow-300">
                👑 Host
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
