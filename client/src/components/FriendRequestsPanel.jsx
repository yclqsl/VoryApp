import { Search, UserCheck, UserPlus, UserX, UsersRound } from "lucide-react";

function getId(user) {
  return user?._id || user?.id || "";
}

function Avatar({ user }) {
  const letter = (user?.username || user?.email || "V").slice(0, 1).toUpperCase();

  if (user?.avatar) {
    return <img src={user.avatar} alt="" className="h-10 w-10 rounded-2xl object-cover" />;
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white">
      {letter}
    </div>
  );
}

function UserLine({ user, right }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/20 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">@{user?.username || "user"}</p>
          <p className="truncate text-xs font-bold text-white/40">{user?.email || "Vory member"}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

export default function FriendRequestsPanel({
  authUser,
  friendState,
  searchQuery,
  setSearchQuery,
  searchResults = [],
  loading = false,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onRemoveFriend,
}) {
  const currentUserId = getId(authUser);
  const friendIds = new Set((friendState?.friends || []).map(getId));
  const sentIds = new Set((friendState?.sent || []).map(getId));
  const receivedIds = new Set((friendState?.received || []).map(getId));

  function renderSearchAction(user) {
    const targetId = getId(user);

    if (!targetId || targetId === currentUserId) return null;

    if (friendIds.has(targetId)) {
      return <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">Friends</span>;
    }

    if (sentIds.has(targetId)) {
      return <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-100">Pending</span>;
    }

    if (receivedIds.has(targetId)) {
      return (
        <button type="button" className="btn-primary w-auto px-3 py-2 text-xs" onClick={() => onAcceptRequest?.(user)}>
          Accept
        </button>
      );
    }

    return (
      <button type="button" className="btn-secondary w-auto px-3 py-2 text-xs" onClick={() => onSendRequest?.(user)}>
        <span className="inline-flex items-center gap-1"><UserPlus size={14} /> Add</span>
      </button>
    );
  }

  return (
    <div className="glass-panel flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-200/60">V13.3 Friends</p>
          <h2 className="mt-1 text-2xl font-black text-white">Friend Requests</h2>
          <p className="mt-1 text-sm font-semibold text-white/45">
            Arkadaş ekle, gelen istekleri kabul et, watch party invite sistemine hazırla.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-white">
          <UsersRound size={16} className="mr-1 inline" /> {friendState?.friends?.length || 0}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
        <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/40">
          <Search size={14} /> Kullanıcı ara
        </label>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery?.(event.target.value)}
          placeholder="username veya email yaz..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-violet-300/50"
        />
      </div>

      {loading && <p className="text-sm font-bold text-white/45">Yükleniyor...</p>}

      {searchQuery?.trim()?.length >= 2 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Search Results</h3>
          {searchResults.length ? (
            searchResults.map((user) => (
              <UserLine key={getId(user)} user={user} right={renderSearchAction(user)} />
            ))
          ) : (
            <p className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-white/40">Sonuç yok.</p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Gelen İstekler</h3>
        {friendState?.received?.length ? (
          friendState.received.map((user) => (
            <UserLine
              key={getId(user)}
              user={user}
              right={
                <div className="flex gap-2">
                  <button type="button" className="btn-primary w-auto px-3 py-2 text-xs" onClick={() => onAcceptRequest?.(user)}>
                    <UserCheck size={14} />
                  </button>
                  <button type="button" className="btn-secondary w-auto px-3 py-2 text-xs" onClick={() => onRejectRequest?.(user)}>
                    <UserX size={14} />
                  </button>
                </div>
              }
            />
          ))
        ) : (
          <p className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-white/40">Gelen istek yok.</p>
        )}
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Arkadaşlar</h3>
          {friendState?.friends?.length ? (
            friendState.friends.map((user) => (
              <UserLine
                key={getId(user)}
                user={user}
                right={<button type="button" className="btn-secondary w-auto px-3 py-2 text-xs" onClick={() => onRemoveFriend?.(user)}>Remove</button>}
              />
            ))
          ) : (
            <p className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-white/40">Henüz arkadaş yok.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Gönderilen</h3>
          {friendState?.sent?.length ? (
            friendState.sent.map((user) => (
              <UserLine key={getId(user)} user={user} right={<span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-100">Pending</span>} />
            ))
          ) : (
            <p className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-white/40">Bekleyen gönderim yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}
