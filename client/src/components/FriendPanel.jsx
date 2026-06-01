import { useEffect, useState } from "react";
import { Check, Circle, Search, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { socket } from "../services/socket";

export default function FriendPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [friends, setFriends] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  function authHeaders() {
    const token = localStorage.getItem("vory_token");
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  function isFriendOnline(friendId) {
    return onlineUsers.some((user) => String(user.userId) === String(friendId));
  }

  async function searchUsers() {
    try {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      const { data } = await api.get(
        `/friends/search?q=${encodeURIComponent(query)}`,
        authHeaders()
      );
      setResults(data.users || []);
    } catch {
      toast.error("Kullanıcı aranamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function sendRequest(toUserId) {
    try {
      const { data } = await api.post("/friends/request", { toUserId }, authHeaders());
      toast.success(data.message || "İstek gönderildi.");
    } catch (error) {
      toast.error(error.response?.data?.message || "İstek gönderilemedi.");
    }
  }

  async function loadRequests() {
    try {
      const { data } = await api.get("/friends/requests", authHeaders());
      setIncoming(data.incoming || []);
    } catch {}
  }

  async function loadFriends() {
    try {
      const { data } = await api.get("/friends/list", authHeaders());
      setFriends(data.friends || []);
    } catch {}
  }

  async function acceptRequest(requestId) {
    try {
      const { data } = await api.post(`/friends/accept/${requestId}`, {}, authHeaders());
      toast.success(data.message || "Kabul edildi.");
      loadRequests();
      loadFriends();
    } catch {
      toast.error("İstek kabul edilemedi.");
    }
  }

  function copyInviteForFriend(friend) {
    const roomCode = window.currentRoomCode;

    if (!roomCode) {
      toast.error("Önce bir odaya gir.");
      return;
    }

    const inviteLink = `https://voryapp.com/?room=${roomCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success(`${friend.username} için davet linki kopyalandı 🚀`);
  }

  useEffect(() => {
    loadRequests();
    loadFriends();

    socket.emit("get-online-users");

    socket.on("online-users", (users) => {
      setOnlineUsers(users || []);
    });

    return () => {
      socket.off("online-users");
    };
  }, []);

  return (
    <section className="glass">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Sosyal</h2>
        <Users size={18} className="text-violet-300" />
      </div>

      <p className="mt-1 text-xs text-white/40">
        Kullanıcı ara, arkadaş ekle ve çevrimiçi arkadaşlarını davet et.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          className="input mt-0"
          placeholder="Kullanıcı adı veya e-posta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchUsers()}
        />

        <button className="btn mt-0 w-auto px-4" onClick={searchUsers}>
          <Search size={17} />
        </button>
      </div>

      {loading && <p className="mt-3 text-sm text-white/40">Aranıyor...</p>}

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-white/35">Sonuçlar</p>

          {results.map((user) => (
            <div key={user._id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/35 p-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{user.username}</p>
                <p className="truncate text-xs text-white/35">{user.email}</p>
              </div>

              <button className="btn-secondary mt-0 flex w-auto items-center gap-2 px-3" onClick={() => sendRequest(user._id)}>
                <UserPlus size={16} />
                Ekle
              </button>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-white/35">Gelen İstekler</p>

          <div className="mt-2 space-y-2">
            {incoming.map((request) => (
              <div key={request._id} className="flex items-center justify-between rounded-2xl bg-black/35 p-3">
                <div>
                  <p className="font-bold">{request.from.username}</p>
                  <p className="text-xs text-white/35">{request.from.email}</p>
                </div>

                <button className="btn-secondary mt-0 w-auto px-3" onClick={() => acceptRequest(request._id)}>
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-white/35">Arkadaşların</p>

        {friends.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-black/25 p-3 text-sm text-white/35">Henüz arkadaş yok.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {friends.map((friend) => {
              const online = isFriendOnline(friend._id);

              return (
                <div key={friend._id} className="rounded-2xl bg-black/35 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{friend.username}</p>

                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <Circle
                          size={9}
                          className={online ? "fill-emerald-400 text-emerald-400" : "fill-white/25 text-white/25"}
                        />
                        <span className={online ? "text-emerald-300" : "text-white/35"}>
                          {online ? "Çevrimiçi" : "Çevrimdışı"}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/40">
                      Arkadaş
                    </span>
                  </div>

                  <button className="btn-secondary mt-3 w-full" onClick={() => copyInviteForFriend(friend)}>
                    Odaya Davet Et
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
