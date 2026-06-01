import { useEffect, useRef } from "react";
import { PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
import YouTube from "react-youtube";
import toast from "react-hot-toast";
import { socket } from "../services/socket";

export default function VideoPlayer({
  videoUrl,
  setVideoUrl,
  onSetVideo,
  onVideoControl,
  onVideoSeek,
  playerRef,
  ignoreEventRef,
  isHost,
}) {
  const lastSeekTimeRef = useRef(0);

  function getYouTubeVideoId(url) {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes("youtube.com")) {
        return parsedUrl.searchParams.get("v");
      }

      if (parsedUrl.hostname.includes("youtu.be")) {
        return parsedUrl.pathname.replace("/", "");
      }

      return "";
    } catch {
      return "";
    }
  }

  const videoId = getYouTubeVideoId(videoUrl);

  function getRoomCodeFromStorage() {
    return window.currentRoomCode || "";
  }

  function handleReady(event) {
    playerRef.current = event.target;

    const roomCode = getRoomCodeFromStorage();

    if (roomCode && !isHost) {
      socket.emit("force-video-sync", { roomCode });
    }
  }

  function handleStateChange(event) {
    if (!isHost) return;
    if (!playerRef.current || ignoreEventRef.current) return;

    const currentTime = playerRef.current.getCurrentTime();

    if (event.data === 1) {
      onVideoControl("play", currentTime);
    }

    if (event.data === 2) {
      onVideoControl("pause", currentTime);
    }
  }

  function syncTime() {
    if (!isHost) {
      toast.error("Sadece host senkron yapabilir.");
      return;
    }

    if (!playerRef.current || ignoreEventRef.current) return;

    const currentTime = playerRef.current.getCurrentTime();

    onVideoSeek(currentTime);
    lastSeekTimeRef.current = currentTime;

    toast.success("Video zamanı senkronlandı.");
  }

  useEffect(() => {
    if (!isHost) return;

    const interval = setInterval(() => {
      if (!playerRef.current) return;

      const roomCode = getRoomCodeFromStorage();
      if (!roomCode) return;

      socket.emit("video-heartbeat", {
        roomCode,
        currentTime: playerRef.current.getCurrentTime(),
        isPlaying: playerRef.current.getPlayerState() === 1,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isHost, playerRef]);

  return (
    <section className="glass flex min-h-[560px] flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Watch Room</h2>
          <p className="text-sm text-white/40">
            YouTube videosunu odadaki herkesle senkron izle.
          </p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
            isHost
              ? "bg-yellow-400/15 text-yellow-300"
              : "bg-white/10 text-white/40"
          }`}
        >
          <ShieldCheck size={16} />
          {isHost ? "Host Control" : "Viewer Mode"}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <input
          className="input mt-0"
          placeholder="YouTube linki gir..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          disabled={!isHost}
        />

        <button
          className="btn mt-0 flex w-auto items-center gap-2 px-5"
          onClick={onSetVideo}
          disabled={!isHost}
        >
          <PlayCircle size={18} />
          Aç
        </button>
      </div>

      {!isHost && (
        <p className="mt-3 rounded-2xl bg-black/30 p-3 text-sm text-white/45">
          Video kontrolü host tarafından yönetiliyor. Sen otomatik senkron
          kalırsın.
        </p>
      )}

      <div className="mt-5 flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black text-white/40 shadow-2xl">
        {videoId ? (
          <YouTube
            videoId={videoId}
            className="h-full w-full"
            iframeClassName="h-full w-full"
            onReady={handleReady}
            onStateChange={handleStateChange}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                controls: isHost ? 1 : 0,
                rel: 0,
                modestbranding: 1,
              },
            }}
          />
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
              <PlayCircle size={34} />
            </div>

            <p className="font-bold text-white/60">Henüz video seçilmedi</p>
            <p className="mt-1 text-sm text-white/30">
              Host bir YouTube linki girince burada oynar.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          className="btn-secondary flex items-center justify-center gap-2"
          onClick={syncTime}
          disabled={!isHost}
        >
          <RefreshCw size={17} />
          Herkesi Senkronla
        </button>
      </div>
    </section>
  );
}