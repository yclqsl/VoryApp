import { Film, Home, Users, Settings, Sparkles } from "lucide-react";

export default function LeftSidebar() {
  return (
    <aside className="hidden h-[calc(100vh-40px)] w-20 flex-col items-center justify-between rounded-3xl border border-white/10 bg-black/30 py-5 backdrop-blur-xl lg:flex">
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/40">
          <Sparkles size={24} />
        </div>

        <div className="flex flex-col gap-3">
          <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-violet-300">
            <Home size={20} />
          </button>

          <button className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/45 transition hover:bg-white/10 hover:text-white">
            <Film size={20} />
          </button>

          <button className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/45 transition hover:bg-white/10 hover:text-white">
            <Users size={20} />
          </button>
        </div>
      </div>

      <button className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/45 transition hover:bg-white/10 hover:text-white">
        <Settings size={20} />
      </button>
    </aside>
  );
}
