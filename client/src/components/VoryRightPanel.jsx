import { ListVideo, MessageCircle, UsersRound } from "lucide-react";
import ChatPanel from "./ChatPanel";
import MediaQueue from "./MediaQueue";
import PresenceFriendPanel from "./PresenceFriendPanel";
import UserList from "./UserList";

const tabs = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "people", label: "People", icon: UsersRound },
  { id: "queue", label: "Queue", icon: ListVideo },
];

export default function VoryRightPanel({
  activeTab = "chat",
  onChange,
  roomCode,
  isHost,
  currentMedia,
  mediaQueue,
  onAddMedia,
  onPlayNext,
  onRemoveMedia,
  onClearQueue,
  onVoteMedia,
  messages,
  message,
  setMessage,
  onSendMessage,
  users,
  onlinePresence,
  currentSocketId,
  onJoinRoom,
  onInviteFriend,
}) {
  const safeTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "chat";

  return (
    <aside className="vory-v5-right-panel !min-w-0 !rounded-[1.75rem] !border-white/10 !bg-black/25 !p-2.5 !shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
      <div className="mb-2 grid grid-cols-3 gap-1.5 rounded-[1.35rem] border border-white/8 bg-black/25 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = safeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange?.(tab.id)}
              className={`flex items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-[11px] font-black transition ${active ? "bg-white text-black" : "text-white/45 hover:bg-white/8 hover:text-white"}`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {safeTab === "chat" && (
          <ChatPanel
            messages={messages}
            message={message}
            setMessage={setMessage}
            onSendMessage={onSendMessage}
          />
        )}

        {safeTab === "people" && (
          <div className="space-y-3">
            <UserList users={users} />
            <PresenceFriendPanel
              onlineUsers={onlinePresence}
              currentSocketId={currentSocketId}
              onJoinRoom={onJoinRoom}
              onInviteFriend={onInviteFriend}
            />
          </div>
        )}

        {safeTab === "queue" && (
          <MediaQueue
            roomCode={roomCode}
            isHost={isHost}
            currentMedia={currentMedia}
            queue={mediaQueue}
            onAdd={onAddMedia}
            onPlayNext={onPlayNext}
            onRemove={onRemoveMedia}
            onClear={onClearQueue}
            onVote={onVoteMedia}
          />
        )}
      </div>
    </aside>
  );
}
