import { Activity, Monitor, Radio, Users, Video, ListVideo } from "lucide-react";

function getActivityIcon(type) {
  if (type === "screen") return Monitor;
  if (type === "voice") return Radio;
  if (type === "video") return Video;
  if (type === "queue") return ListVideo;
  if (type === "room") return Users;
  return Activity;
}

function timeAgo(timestamp) {
  if (!timestamp) return "şimdi";

  const diff = Date.now() - timestamp;
  const seconds = Math.max(1, Math.floor(diff / 1000));

  if (seconds < 60) return "şimdi";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export default function ActivityFeed({ activities = [] }) {
  return (
    <section className="vory-activity-feed">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="text-sm font-black text-white">Room Activity</h2>
        <p className="mt-1 text-xs text-white/35">
          Oda içindeki canlı hareketler.
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-3xl bg-white/[0.04] p-5 text-center text-sm text-white/35">
          Henüz aktivite yok.
        </div>
      ) : (
        activities.map((item) => {
          const Icon = getActivityIcon(item.type);

          return (
            <article key={item.id} className="vory-activity-item">
              <div className="flex gap-3">
                <div className="vory-activity-icon">
                  <Icon size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-black text-white">
                      {item.title || "Activity"}
                    </h3>

                    <span className="shrink-0 text-[11px] font-bold text-white/30">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-5 text-white/55">
                    {item.message}
                  </p>
                </div>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
