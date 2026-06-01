import { Film, Home, Settings, Sparkles, Users, Mic2, BarChart3 } from "lucide-react";

function NavItem({ icon: Icon, label, active }) {
  return (
    <button
      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
        active
          ? "bg-white/12 text-white shadow-lg shadow-violet-950/20"
          : "text-white/45 hover:bg-white/8 hover:text-white"
      }`}
    >
      <Icon size={19} className={active ? "text-violet-300" : "text-white/40 group-hover:text-violet-300"} />
      <span className="hidden xl:block">{label}</span>
    </button>
  );
}

export default function LeftSidebar() {
  return (
    <aside className="hidden h-[calc(100vh-40px)] w-20 shrink-0 flex-col rounded-[30px] border border-white/10 bg-black/25 p-3 backdrop-blur-2xl lg:flex xl:w-64">
      <div className="mb-6 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-violet-600/90 to-fuchsia-600/80 p-3 shadow-lg shadow-violet-900/35">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Sparkles size={24} />
        </div>
        <div className="hidden xl:block">
          <p className="text-lg font-black">VoryApp</p>
          <p className="text-xs text-white/60">Live watch rooms</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        <NavItem icon={Home} label="Ana Sayfa" active />
        <NavItem icon={Film} label="Watch Room" />
        <NavItem icon={Users} label="Arkadaşlar" />
        <NavItem icon={Mic2} label="Voice Chat" />
      </nav>

      <div className="mt-6 space-y-2">
        <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-4 xl:block">
          <div className="flex items-center gap-2 text-sm font-black">
            <BarChart3 size={17} className="text-emerald-300" />
            Vory Stats
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/40">
            Oda analizleri ve premium özellikler yakında.
          </p>
        </div>

        <NavItem icon={Settings} label="Ayarlar" />
      </div>
    </aside>
  );
}
