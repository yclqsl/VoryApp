import { useEffect, useRef } from "react";
import { PlayCircle, ShieldCheck } from "lucide-react";
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
  const recoveryTimerRef = useRef(null);
  const lastForceSyncRef = useRef(0);
  const autoNextLockRef = useRef(false);

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

  function requestForceSync(reason = "recovery") {
    const roomCode = getRoomCode();
    if (!roomCode) return;

    const now = Date.now();
    const minDelay = reason === "initial-ready" ? 650 : 3200;

    if (now - lastForceSyncRef.current < minDelay) return;
    lastForceSyncRef.current = now;

    socket.emit("force-video-sync", { roomCode, reason });
  }

  function requestAutoNext() {
    if (!isHost) return;
    if (autoNextLockRef.current) return;

    const roomCode = getRoomCode();
    if (!roomCode) return;

    autoNextLockRef.current = true;

    socket.emit("media-play-next", { roomCode });
    toast("Sıradaki medya otomatik başlatılıyor 🎬", { icon: "⏭️" });

    setTimeout(() => {
      autoNextLockRef.current = false;
    }, 2500);
  }

  function handleReady(event) {
    playerRef.current = event.target;

    // Yeni giren viewer host state'ini otomatik alır.
    // Manuel "herkesi senkronla" yerine Rave tarzı otomatik recovery.
    if (!isHost) {
      setTimeout(() => requestForceSync("initial-ready"), 450);
      setTimeout(() => requestForceSync("initial-ready"), 1800);
    }
  }

  function handleStateChange(event) {
    if (!playerRef.current || ignoreEventRef.current) return;

    // Viewer local play/pause yaparsa hostu etkilemez; sync otomatik düzelir.
    if (!isHost) return;

    const currentTime = playerRef.current.getCurrentTime();

    if (event.data === 1) onVideoControl("play", currentTime);
    if (event.data === 2) onVideoControl("pause", currentTime);

    // YouTube state 0 = video bitti. Host bitişi algılayınca sıradaki medyayı açar.
    if (event.data === 0) {
      onVideoControl("pause", currentTime);
      requestAutoNext();
    }
  }

  function handleError(event) {
    console.error("YouTube player error:", event.data);

    if (event.data === 101 || event.data === 150) {
      toast.error("Bu YouTube videosu gömülü oynatmaya izin vermiyor.");
      return;
    }

    toast.error("Video yüklenemedi. Farklı bir YouTube linki dene.");
  }

  useEffect(() => {
    clearInterval(heartbeatRef.current);

    if (!isHost) return;

    // Host state serverda canlı kalsın; viewerlar otomatik drift correction yapar.
    heartbeatRef.current = setInterval(() => {
      if (!playerRef.current) return;

      const roomCode = getRoomCode();
      if (!roomCode) return;

      socket.emit("video-heartbeat", {
        roomCode,
        currentTime: playerRef.current.getCurrentTime(),
        isPlaying: playerRef.current.getPlayerState() === 1,
      });
    }, 3000);

    return () => clearInterval(heartbeatRef.current);
  }, [isHost, playerRef]);

  useEffect(() => {
    clearTimeout(recoveryTimerRef.current);

    if (!videoId || isHost) return;

    // Periyodik hard sync kaldırıldı. Voice chat sırasında bu döngü YouTube'a sürekli seek attırıyordu.
    // Bunun yerine sadece görünürlük/focus geri geldiğinde yumuşak recovery istiyoruz.
    const recover = () => {
      recoveryTimerRef.current = setTimeout(() => requestForceSync("focus-recovery"), 350);
    };

    const handleVisibility = () => {
      if (!document.hidden) recover();
    };

    window.addEventListener("focus", recover);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(recoveryTimerRef.current);
      window.removeEventListener("focus", recover);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [videoId, isHost]);

  return (
    <section className="glass flex min-h-[68vh] flex-1 flex-col !rounded-[1.7rem] !border-white/8 !bg-black/16 !p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/28">
            Watch Party
          </p>
          <h2 className="text-lg font-black text-white">
            {videoId ? "Now Playing" : "Ready to Watch"}
          </h2>
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

      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[1.55rem] border border-white/10 bg-black text-white/40 shadow-2xl">
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

    </section>
  );
}
