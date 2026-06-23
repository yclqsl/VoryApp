import { Crown, ListVideo, MessageCircle, Mic, MicOff, Play, Trash2, UsersRound } from "lucide-react";
import ChatPanel from "./ChatPanel";

function mediaLabel(item) {
  if (!item) return "Vory";
  if (item.channelTitle) return item.channelTitle;
  if (item.type === "youtube") return "YouTube";
  return item.addedBy || "Vory";
}

function getUserKey(user, index) {
  return user?.id || user?.userId || user?.socketId || user?.username || `user-${index}`;
}

function userInitial(name = "V") {
  return String(name || "V").trim().charAt(0).toUpperCase() || "V";
}

function findVoiceUser(user, voiceUsers = []) {
  return (voiceUsers || []).find(
    (item) =>
      String(item?.socketId || "") === String(user?.id || "") ||
      String(item?.userId || "") === String(user?.userId || user?._id || "") ||
      String(item?.username || "") === String(user?.username || "")
  );
}

function PeoplePanel({ users = [], voiceUsers = [] }) {
  const voiceCount = voiceUsers.length || 0;

  return (
    <div className="vory-people-premium vory-people-premium-553e space-y-3 p-0.5">
      <div className="vory-people-hero">
        <div>
          <p className="vory-people-kicker">Party crew</p>
          <h3>Crew</h3>
          <span>{users.length || 0} izliyor • {voiceCount} seste</span>
        </div>
        <div className="vory-people-stack">
          {users.slice(0, 4).map((user, index) => {
            const name = user?.username || "Vory";
            return user?.avatar ? (
              <img key={getUserKey(user, index)} src={user.avatar} alt="" />
            ) : (
              <b key={getUserKey(user, index)}>{userInitial(name)}</b>
            );
          })}
          {!users.length ? <b>V</b> : null}
        </div>
      </div>

      <div className="vory-people-list">
        {!users.length ? (
          <div className="vory-people-empty">Odada henüz kimse yok.</div>
        ) : (
          users.map((user, index) => {
            const name = user?.username || "Kullanıcı";
            const voiceUser = findVoiceUser(user, voiceUsers);
            const inVoice = !!voiceUser;
            const muted = !!voiceUser?.muted;
            const speaking = Number(voiceUser?.level || 0) > 14 && !muted;

            return (
              <div
                key={getUserKey(user, index)}
                className={`vory-people-row ${speaking ? "is-speaking" : ""}`}
              >
                <div className="vory-people-avatar">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{userInitial(name)}</span>}
                  <i className={inVoice ? "is-voice" : ""} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-black text-white">{name}</p>
                    {user?.isHost ? (
                      <em className="vory-people-host"><Crown size={11} /> Host</em>
                    ) : null}
                  </div>
                  <small className={speaking ? "text-emerald-200" : inVoice ? "text-sky-200/80" : "text-white/32"}>
                    {muted ? "Sessiz" : speaking ? "Konuşuyor" : inVoice ? "Seste" : "İzliyor"}
                  </small>
                </div>

                <div className="vory-people-action">
                  {inVoice ? (muted ? <MicOff size={15} /> : <Mic size={15} />) : <UsersRound size={15} />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function VoryRightPanel({
  activeTab = "chat",
  onChange,
  roomCode,
  isHost,
  currentMedia,
  mediaQueue = [],
  onPlayNext,
  onRemoveMedia,
  onClearQueue,
  messages,
  message,
  setMessage,
  onSendMessage,
  onInviteClick,
  typingUser,
  onTyping,
  users = [],
  voiceUsers = [],
  currentUser = null,
  voiceSlot = null,
  mobile = false,
  syncQuality = null,
}) {
  const safeTab = activeTab === "queue" || activeTab === "people" ? activeTab : "chat";

  const tabButton = (id, label, icon, badge = null) => {
    const Icon = icon;
    const active = safeTab === id;

    return (
      <button
        type="button"
        onClick={() => onChange?.(id)}
        className={`vory-modern-tab-btn relative flex min-w-0 items-center justify-center gap-1.5 rounded-[1rem] px-2 py-2 text-[10px] font-black transition ${
          active
            ? "bg-white text-black shadow-[0_12px_36px_rgba(255,255,255,0.16)]"
            : "bg-white/[0.045] text-white/45 hover:bg-white/[0.075] hover:text-white/80"
        }`}
      >
        <Icon size={14} />
        {label}
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[9px] text-white">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <aside className={`vory-v5-right-panel vory-rave-gap-right-panel vory-rave-tight-right-panel vory-right-panel-compressed vory-right-panel-549 !min-w-0 !rounded-[1.45rem] !border-white/10 !bg-black/24 !shadow-[0_18px_70px_rgba(0,0,0,0.32)] ${mobile ? "!p-2" : "!p-2"}`}>
      <div className="vory-right-tabs-549 mb-1.5 vory-right-tabs-modern vory-rave-gap-tabs grid grid-cols-3 gap-1 overflow-hidden rounded-[1.15rem] border border-white/10 bg-white/[0.035] p-1">
        {tabButton("chat", "Chat", MessageCircle)}
        {tabButton("queue", "Queue", ListVideo, mediaQueue.length || null)}
        {tabButton("people", "Crew", UsersRound, users.length || null)}
      </div>

      <div className="vory-right-body-549 min-h-0 flex-1 overflow-auto pr-1">
        {safeTab === "chat" ? (
          <ChatPanel
            messages={messages}
            message={message}
            setMessage={setMessage}
            onSendMessage={onSendMessage}
            onInviteClick={onInviteClick}
            typingUser={typingUser}
            onTyping={onTyping}
            users={users}
            currentUser={currentUser}
            voiceSlot={voiceSlot}
          />
        ) : null}

        {safeTab === "queue" ? (
          <div className="space-y-2 p-0.5">
            <div className="rounded-[1.05rem] border border-emerald-300/12 bg-emerald-400/10 p-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/65">Now Playing</p>
              <p className="mt-1 line-clamp-2 text-sm font-black text-white">{currentMedia?.title || "Video bekleniyor"}</p>
              <p className="mt-1 truncate text-xs font-bold text-white/36">{mediaLabel(currentMedia)}</p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Up Next • {mediaQueue.length}</p>
              {isHost && mediaQueue.length ? (
                <button type="button" onClick={onClearQueue} className="rounded-full bg-red-500/12 px-3 py-1.5 text-[10px] font-black text-red-200 transition hover:bg-red-500/22">Clear</button>
              ) : null}
            </div>

            {!mediaQueue.length ? (
              <div className="rounded-[1.15rem] border border-white/8 bg-white/[0.035] p-3 text-sm font-bold text-white/35">Sırada video yok. YouTube browser’dan Add Queue ile ekle knks.</div>
            ) : (
              <div className="space-y-2">
                {mediaQueue.map((item, index) => (
                  <div key={item.id || `${item.url}-${index}`} className="group rounded-[1.15rem] border border-white/8 bg-white/[0.045] p-2.5 transition hover:bg-white/[0.065]">
                    <div className="flex items-center gap-3">
                      {item.thumbnail ? <img src={item.thumbnail} alt="" className="h-12 w-20 shrink-0 rounded-xl object-cover" /> : <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl bg-white/8 text-xs font-black text-white/45">{index + 1}</div>}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-black text-white/82">{item.title || item.url}</p>
                        <p className="mt-1 truncate text-[10px] font-bold text-white/32">{mediaLabel(item)}</p>
                      </div>
                    </div>
                    {isHost ? (
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={onPlayNext} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[10px] font-black text-emerald-200 transition hover:bg-emerald-500/25"><Play size={12} />{mobile ? "Play" : "Play Next"}</button>
                        <button type="button" onClick={() => onRemoveMedia?.(item.id)} className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1.5 text-[10px] font-black text-red-200 transition hover:bg-red-500/20"><Trash2 size={12} />Remove</button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {safeTab === "people" ? <PeoplePanel users={users} voiceUsers={voiceUsers} /> : null}
      </div>
    </aside>
  );
}
