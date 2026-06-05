import { CheckCircle2, Gem, Lock, Sparkles, Star, Trophy, Wand2 } from "lucide-react";

function compactNumber(value = 0) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(safeValue >= 10000 ? 0 : 1)}k`;
  return String(safeValue);
}

function itemTypeLabel(type = "") {
  if (type === "frame") return "Avatar Frame";
  if (type === "theme") return "Profile Theme";
  if (type === "glow") return "Profile Glow";
  return "Cosmetic";
}

export default function CustomizationStorePanel({
  profileProgress,
  stats,
  loading = false,
  onRefresh,
  onUnlockItem,
  onEquipItem,
}) {
  const customization = profileProgress?.customization || { items: [], active: {}, totalSpentXp: 0 };
  const items = customization.items || [];
  const profileXp = Number(profileProgress?.profileXp || 0);
  const spentXp = Number(customization.totalSpentXp || 0);
  const spendableXp = Math.max(0, profileXp - spentXp);
  const unlockedCount = items.filter((item) => item.owned).length;

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gem size={18} className="text-fuchsia-200" />
            <h2 className="text-lg font-black">Cosmetics</h2>
          </div>
          <p className="mt-1 text-xs text-white/40">
            XP ile avatar frame, profile theme ve glow aç. Profil kozmetikleri artık burada ayrı duruyor.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-2xl bg-white/8 px-3 py-2 text-xs font-black text-white/60 transition hover:bg-white/12 hover:text-white"
        >
          {loading ? "Yükleniyor..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/5 p-3 text-center">
          <p className="text-base font-black text-fuchsia-100">{compactNumber(spendableXp)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Spend XP</p>
        </div>
        <div className="rounded-2xl border border-yellow-300/10 bg-yellow-400/5 p-3 text-center">
          <p className="text-base font-black text-yellow-100">{unlockedCount}/{items.length}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Unlocked</p>
        </div>
        <div className="rounded-2xl border border-sky-300/10 bg-sky-400/5 p-3 text-center">
          <p className="text-base font-black text-sky-100">{compactNumber(spentXp)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Spent</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 text-sm text-white/40">
            Store itemleri yükleniyor. Profile progress sync sonrası burada görünecek.
          </div>
        ) : (
          items.map((item) => {
            const canBuy = !item.owned && !item.locked && spendableXp >= Number(item.costXp || 0);
            const costText = Number(item.costXp || 0) > 0 ? `${compactNumber(item.costXp)} XP` : "Badge Unlock";

            return (
              <div key={item.id} className="rounded-3xl border border-white/5 bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/25 text-lg">
                        {item.icon || "✨"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">{item.title}</p>
                        <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                          {itemTypeLabel(item.type)} • {costText}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/45">{item.description}</p>
                    {item.locked ? (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-400/10 px-3 py-1 text-[11px] font-bold text-red-200">
                        <Lock size={12} /> {item.lockReason || "Kilitli"}
                      </p>
                    ) : item.equipped ? (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-200">
                        <CheckCircle2 size={12} /> Equipped
                      </p>
                    ) : item.owned ? (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-3 py-1 text-[11px] font-bold text-sky-200">
                        <Star size={12} /> Unlocked
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {!item.owned ? (
                      <button
                        type="button"
                        disabled={!canBuy || loading}
                        onClick={() => onUnlockItem?.(item)}
                        className="rounded-2xl bg-fuchsia-400/15 px-3 py-2 text-xs font-black text-fuchsia-100 transition hover:bg-fuchsia-400/25 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Sparkles size={13} className="mr-1 inline" /> Unlock
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={item.equipped || loading}
                        onClick={() => onEquipItem?.(item)}
                        className="rounded-2xl bg-violet-400/15 px-3 py-2 text-xs font-black text-violet-100 transition hover:bg-violet-400/25 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Wand2 size={13} className="mr-1 inline" /> Equip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
