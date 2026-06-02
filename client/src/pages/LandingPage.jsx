import {
  ArrowRight,
  MonitorPlay,
  Radio,
  ScreenShare,
  UsersRound,
  Video,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Watch Party",
    desc: "YouTube, MP4 ve direct video linkleriyle arkadaşlarınla senkron izle.",
  },
  {
    icon: Radio,
    title: "Voice Chat",
    desc: "Odadan çıkmadan konuş, aktif konuşanı glow efektiyle gör.",
  },
  {
    icon: ScreenShare,
    title: "Screen Share",
    desc: "Tek tıkla ekran paylaş, odadakiler canlı izlesin.",
  },
  {
    icon: UsersRound,
    title: "Presence",
    desc: "Kim online, kim odada, kim seslide anlık takip et.",
  },
];

export default function LandingPage({ onLogin, onRegister, onEnterApp }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080711] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute right-0 top-28 h-[420px] w-[420px] rounded-full bg-fuchsia-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] rounded-full bg-indigo-700/20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <button
          type="button"
          onClick={onEnterApp}
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/25 text-xl font-black shadow-[0_0_30px_rgba(139,92,246,0.35)]">
            V
          </div>
          <div className="text-left">
            <p className="text-base font-black">VoryApp</p>
            <p className="text-xs text-white/40">Watch together</p>
          </div>
        </button>

        <nav className="hidden items-center gap-6 text-sm font-bold text-white/55 md:flex">
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#preview" className="transition hover:text-white">Preview</a>
          <a href="#beta" className="transition hover:text-white">Beta</a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLogin}
            className="hidden rounded-2xl px-4 py-2 text-sm font-black text-white/70 transition hover:bg-white/8 hover:text-white sm:block"
          >
            Giriş Yap
          </button>

          <button
            type="button"
            onClick={onRegister || onEnterApp}
            className="rounded-2xl bg-violet-500/25 px-4 py-2 text-sm font-black text-violet-100 transition hover:bg-violet-500/35"
          >
            Başla
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:pt-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200">
            <Zap size={14} />
            VoryApp Beta yakında
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Watch together.
            <span className="block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-emerald-200 bg-clip-text text-transparent">
              Talk together.
            </span>
            Share together.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/55">
            VoryApp; arkadaşlarınla senkron video izleme, sesli sohbet,
            ekran paylaşımı ve sosyal presence deneyimini tek odada toplar.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onRegister || onEnterApp}
              className="group flex items-center justify-center gap-2 rounded-3xl bg-white px-6 py-4 text-base font-black text-black transition hover:scale-[1.02]"
            >
              Hemen Başla
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={onLogin || onEnterApp}
              className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-4 text-base font-black text-white transition hover:bg-white/[0.1]"
            >
              Giriş Yap
            </button>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-2xl font-black">Sync</p>
              <p className="mt-1 text-xs text-white/40">Watch Party</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-2xl font-black">Voice</p>
              <p className="mt-1 text-xs text-white/40">Live Chat</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-2xl font-black">Share</p>
              <p className="mt-1 text-xs text-white/40">Screen</p>
            </div>
          </div>
        </div>

        <div id="preview" className="relative">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-violet-500/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/35 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                LIVE ROOM
              </span>
            </div>

            <div className="aspect-video rounded-[2rem] bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-black p-5">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-black">
                    ROOM A7K92P
                  </span>
                  <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-black text-emerald-200">
                    4 online
                  </span>
                </div>

                <div>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                    <MonitorPlay size={30} />
                  </div>
                  <h3 className="text-2xl font-black">Movie Night</h3>
                  <p className="mt-1 text-sm text-white/55">
                    Senkron video + voice + screen share
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {["Voice aktif", "Screen ready", "Queue 3"].map((item) => (
                <div key={item} className="rounded-2xl bg-white/[0.06] p-3 text-center text-xs font-black text-white/65">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-violet-200/55">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Bir watch-party uygulamasından fazlası.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:bg-white/[0.07]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/45">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="beta" className="relative z-10 mx-auto max-w-7xl px-5 pb-20">
        <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-[0_24px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
          <h2 className="text-3xl font-black sm:text-4xl">
            VoryApp Beta için hazır mısın?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            İlk beta sürümde arkadaşlarınla oda kur, video sıraya ekle,
            konuş ve aynı anda izle.
          </p>

          <button
            type="button"
            onClick={onRegister || onEnterApp}
            className="mt-7 rounded-3xl bg-white px-7 py-4 font-black text-black transition hover:scale-[1.02]"
          >
            Beta’ya Katıl
          </button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-white/35 sm:flex-row">
          <p>© {new Date().getFullYear()} VoryApp</p>
          <p>Watch. Talk. Share.</p>
        </div>
      </footer>
    </main>
  );
}
