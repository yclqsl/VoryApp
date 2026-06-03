import { Activity, ListVideo, MessageCircle, UsersRound } from "lucide-react";
import ChatPanel from "./ChatPanel";
import MediaQueue from "./MediaQueue";
import PresenceFriendPanel from "./PresenceFriendPanel";
import UserList from "./UserList";
import ActivityFeed from "./ActivityFeed";

const tabs = [
  { id: "queue", label: "Queue", icon: ListVideo },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "people", label: "People", icon: UsersRound },
  { id: "activity", label: "Activity", icon: Activity },
];

export default function VoryRightPanel({
  activeTab,
  onChange,
  roomCode,
  isHost,
  currentMedia,
  mediaQueue,
  onAddMedia,
  onPlayNext,
  onRemoveMedia,
  onClearQueue,
  messages,
  message,
  setMessage,
  onSendMessage,
  users,
  onlinePresence,
  currentSocketId,
  onJoinRoom,
  onInviteFriend,
  activities = [],
}) {
  return (
    <aside className="vory-v5-right-panel">
      <div className="vory-v5-panel-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange?.(tab.id)}
              className={`vory-v5-panel-tab ${active ? "vory-v5-panel-tab-active" : ""}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {activeTab === "queue" && (
          <MediaQueue
            roomCode={roomCode}
            isHost={isHost}
            currentMedia={currentMedia}
            queue={mediaQueue}
            onAdd={onAddMedia}
            onPlayNext={onPlayNext}
            onRemove={onRemoveMedia}
            onClear={onClearQueue}
          />
        )}

        {activeTab === "chat" && (
          <ChatPanel
            messages={messages}
            message={message}
            setMessage={setMessage}
            onSendMessage={onSendMessage}
          />
        )}

        {activeTab === "people" && (
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

        {activeTab === "activity" && (
          <ActivityFeed activities={activities} />
        )}
      </div>
    </aside>
  );
}
