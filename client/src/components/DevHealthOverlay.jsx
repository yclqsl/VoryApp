import { Activity } from "lucide-react";

export default function DevHealthOverlay({
  connectionStatus,
  roomCode,
  isHost,
  userCount,
  queueCount,
  currentMedia,
}) {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 hidden w-64 rounded-3xl border border-white/10 bg-black/80 p-4 text-xs text-white/60 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:block">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
        <Activity size={16} className="text-emerald-300" />
        Dev Health
      </div>

      <div className="space-y-1.5">
        <p>Socket: <span className="font-bold text-white">{connectionStatus}</span></p>
        <p>Room: <span className="font-bold text-white">{roomCode || "none"}</span></p>
        <p>Role: <span className="font-bold text-white">{isHost ? "host" : "viewer"}</span></p>
        <p>Users: <span className="font-bold text-white">{userCount}</span></p>
        <p>Queue: <span className="font-bold text-white">{queueCount}</span></p>
        <p className="truncate">Media: <span className="font-bold text-white">{currentMedia?.title || "none"}</span></p>
      </div>
    </div>
  );
}
