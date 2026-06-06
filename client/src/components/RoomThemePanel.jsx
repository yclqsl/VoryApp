import { Gamepad2, Palette, Sparkles, Stars, Ticket } from "lucide-react";

const themes = [
  {
    id: "neon",
    name: "Neon",
    icon: Sparkles,
    description: "Vory mor/pembe glow.",
    chip: "Default",
  },
  {
    id: "cinema",
    name: "Cinema",
    icon: Ticket,
    description: "Koyu sinema havası.",
    chip: "Movie",
  },
  {
    id: "galaxy",
    name: "Galaxy",
    icon: Stars,
    description: "Uzay gradient + premium glow.",
    chip: "Premium",
  },
  {
    id: "gaming",
    name: "Gaming",
    icon: Gamepad2,
    description: "Yeşil neon gaming hissi.",
    chip: "RGB",
  },
];

export default function RoomThemePanel({
  roomCode,
  isHost,
  activeTheme = "neon",
  onThemeChange,
  compact = false,
}) {
  return (
    <section className={compact ? "rounded-[1.75rem] border border-white/10 bg-black/20 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl" : "glass-panel p-5"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-200/55">
            Room Settings
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Oda Teması
          </h2>
          <p className="mt-1 text-sm font-bold text-white/40">
            {isHost
              ? "Host temayı değiştirince herkes anında görür."
              : "Temayı sadece host değiştirebilir."}
          </p>
        </div>

        <div className="rounded-2xl bg-white/8 p-3 text-violet-200">
          <Palette size={18} />
        </div>
      </div>

      <div className={compact ? "mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
        {themes.map((theme) => {
          const Icon = theme.icon;
          const active = activeTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              disabled={!roomCode || !isHost}
              onClick={() => onThemeChange?.(theme.id)}
              className={`group rounded-[1.35rem] border ${compact ? "p-3" : "p-4"} text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                active
                  ? "border-violet-300/35 bg-violet-500/20 shadow-[0_0_32px_rgba(139,92,246,0.16)]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/18 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`flex ${compact ? "h-9 w-9" : "h-11 w-11"} items-center justify-center rounded-2xl ${
                    active ? "bg-violet-400/20 text-violet-100" : "bg-black/25 text-white/45"
                  }`}
                >
                  <Icon size={19} />
                </span>

                <span className="rounded-full bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/45">
                  {theme.chip}
                </span>
              </div>

              <h3 className={compact ? "mt-2 text-sm font-black text-white" : "mt-3 text-base font-black text-white"}>
                {theme.name}
              </h3>
              {!compact ? (
                <p className="mt-1 text-xs font-bold leading-5 text-white/40">
                  {theme.description}
                </p>
              ) : null}

              {active ? (
                <p className="mt-3 text-xs font-black text-emerald-200">
                  Aktif tema ✅
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
