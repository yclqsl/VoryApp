import { useEffect, useRef } from "react";
import { PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
import YouTube from "react-youtube";
import toast from "react-hot-toast";
import { socket } from "../services/socket";

export default function VideoPlayer({
  videoUrl,
  videoInput,
  setVideoInput,
  onSetVideo,
  onVideoControl,
  onVideoSeek,
  playerRef,
  ignoreEventRef,
  isHost,
}) {
  const heartbeatRef = useRef(null);
  const driftCheckRef = useRef(null);

  function getYouTubeVideoId(url) {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes("youtube.com")) {
        if (parsedUrl.pathname.includes("/shorts/")) {
          return parsedUrl.pathname.split("/shorts/")[1]?.split("?")[0] || "";
        }

        if (parsedUrl.pathname.includes("/embed/")) {
          return parsedUrl.pathname.split("/embed/")[1]?.split("?")[0] || "";
        }

        return parsedUrl.searchParams.get("v") || "";
      }

      if (parsedUrl.hostname.includes("youtu.be")) {
        return parsedUrl.pathname.replace("/", "").split("?")[0];
      }

      return "";
    } catch {
      return "";
    }
  }

  const videoId = getYouTubeVideoId(videoUrl);

  function getRoomCode() {
    return window.currentRoomCode || "";
  }

  function requestForceSync() {
    const roomCode = getRoomCode();
    if (!roomCode) return;

    socket.emit("force-video-sync", { roomCode });
  }

  function handleReady(event) {
    playerRef.current = event.target;

    // Yeni giren viewer sadece ilk açılışta host durumuna çekilir.
    if (!isHost) {
      setTimeout(() => {
        requestForceSync();
      }, 900);
    }
  }

  function handleStateChange(event) {
    if (!playerRef.current || ignoreEventRef.current) return;

    // Viewer'ın local play/pause yapması hostu etkilemez.
    // Sürekli geri çekmeyiz; 30 sn drift kontrolü bunu gerekirse düzeltir.
    if (!isHost) return;

    const currentTime = playerRef.current.getCurrentTime();

    if (event.data === 1) onVideoControl("play", currentTime);
    if (event.data === 2) onVideoControl("pause", currentTime);
    if (event.data === 0) onVideoControl("pause", currentTime);
  }

  function handleError(event) {
    console.error("YouTube player error:", event.data);

    if (event.data === 101 || event.data === 150) {
      toast.error("Bu YouTube videosu gömülü oynatmaya izin vermiyor.");
      return;
    }

    toast.error("Video yüklenemedi. Farklı bir YouTube linki dene.");
  }

  function syncTime() {
    if (!isHost) {
      toast.error("Sadece host senkron yapabilir.");
      return;
    }

    if (!playerRef.current || ignoreEventRef.current) return;

    const currentTime = playerRef.current.getCurrentTime();
    onVideoSeek(currentTime);

    toast.success("Herkes senkronlandı ⚡");
  }

  useEffect(() => {
    clearInterval(heartbeatRef.current);

    if (!isHost) return;

    // Host state'i serverda güncel kalsın diye seyrek heartbeat.
    // Bu emit viewer'a seek yaptırmaz, sadece state saklar.
    heartbeatRef.current = setInterval(() => {
      if (!playerRef.current) return;

      const roomCode = getRoomCode();
      if (!roomCode) return;

      socket.emit("video-heartbeat", {
        roomCode,
        currentTime: playerRef.current.getCurrentTime(),
        isPlaying: playerRef.current.getPlayerState() === 1,
      });
    }, 10000);

    return () => clearInterval(heartbeatRef.current);
  }, [isHost, playerRef]);

  useEffect(() => {
    clearInterval(driftCheckRef.current);

    if (!videoId || isHost) return;

    // Rave tarzı: sürekli çekme yok.
    // Viewer sadece 30 saniyede bir host durumunu sorar.
    // Home.jsx drift küçükse seek yapmaz.
    driftCheckRef.current = setInterval(() => {
      requestForceSync();
    }, 30000);

    return () => clearInterval(driftCheckRef.current);
  }, [videoId, isHost]);

  return (
    <section className="glass flex min-h-[560px] flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Watch Room</h2>
          <p className="text-sm text-white/40">
            Rave tarzı yumuşak senkron: sadece büyük farklarda düzeltir.
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
          value={videoInput}
          onChange={(e) => setVideoInput(e.target.value)}
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
          İzleyici modundasın. Ses ve tam ekran kontrolleri açık; hostu etkilemezsin.
        </p>
      )}

      <div className="relative mt-5 flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black text-white/40 shadow-2xl">
        {videoId ? (
          <YouTube
            key={videoId}
            videoId={videoId}
            className="h-full w-full"
            iframeClassName="h-full w-full"
            onReady={handleReady}
            onStateChange={handleStateChange}
            onError={handleError}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                controls: 1,
                disablekb: isHost ? 0 : 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
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
