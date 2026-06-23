import { BarChart3, Clock, MessageCircle, Sparkles, Users } from "lucide-react";

export default function AnalyticsCard() {
  return (
    <div className="mt-4 rounded-3xl border border-white/8 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200/55">
            Analytics
          </p>
          <h3 className="mt-1 text-lg font-black">Profile Activity</h3>
        </div>

        <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-200">
          <BarChart3 size={18} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-black/20 p-3">
          <Users size={16} />
          <p className="mt-2 text-2xl font-black">0</p>
          <p className="text-xs text-white/40">Rooms Joined</p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3">
          <Clock size={16} />
          <p className="mt-2 text-2xl font-black">0h</p>
          <p className="text-xs text-white/40">Watch Time</p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3">
          <MessageCircle size={16} />
          <p className="mt-2 text-2xl font-black">0</p>
          <p className="text-xs text-white/40">Messages</p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3">
          <Sparkles size={16} />
          <p className="mt-2 text-2xl font-black">0</p>
          <p className="text-xs text-white/40">Reactions</p>
        </div>
      </div>
    </div>
  );
}
