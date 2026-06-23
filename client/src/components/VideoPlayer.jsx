import { memo, useEffect, useRef, useState } from "react";
import { PlayCircle } from "lucide-react";
import YouTube from "react-youtube";
import toast from "react-hot-toast";
import { socket } from "../services/socket";

function VideoPlayer({
  videoUrl,
  videoInput,
  setVideoInput,
  onSetVideo,
  onVideoControl,
  onVideoSeek,
  playerRef,
  ignoreEventRef,
  isHost,
  fullscreenChatToast = null,
}) {
  const recoveryTimerRef = useRef(null);
  const lastForceSyncRef = useRef(0);
  const autoNextLockRef = useRef(false);
  const hostAutoPlayDoneRef = useRef("");
  const localPlayerRef = useRef(null);
  const readyVersionRef = useRef(0);
  const lastHostActionRef = useRef({ action: "", at: 0 });
  const fullscreenShellRef = useRef(null);
  const autoPlayBurstTimersRef = useRef([]);
  const viewerAutoStartedRef = useRef(false);
  const lastKnownPlayingRef = useRef(false);
  const lastUserPauseAtRef = useRef(0);
  const [isVoryFullscreen, setIsVoryFullscreen] = useState(false);

  const volumeKickDoneRef = useRef("");

  function normalizePlaybackVolume(player, { allowUnmute = false, preferredVolume = null } = {}) {
    if (!player) return;

    try {
      const targetVolume = Math.max(0, Math.min(100, Number(preferredVolume ?? (isHost ? 100 : 85)) || 100));
      player.setVolume?.(targetVolume);
      if (allowUnmute) {
        player.unMute?.();
      }
    } catch {}
  }

  function burstNormalizePlaybackVolume(player, { allowUnmute = false, preferredVolume = null } = {}) {
    if (!player) return;

    [0, 120, 360, 900, 1700].forEach((delay) => {
      const timer = window.setTimeout(() => {
        normalizePlaybackVolume(player, { allowUnmute, preferredVolume });
      }, delay);
      autoPlayBurstTimersRef.current.push(timer);
    });
  }

  
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

  useEffect(() => {
    function unlockPlaybackAudio() {
      try {
        window.__voryPlaybackUserUnlocked = true;
        const player = playerRef.current || localPlayerRef.current;
        if (player) {
          normalizePlaybackVolume(player, { allowUnmute: true, preferredVolume: isHost ? 100 : 85 });
        }
      } catch {}
    }

    window.addEventListener("pointerdown", unlockPlaybackAudio, { passive: true });
    window.addEventListener("touchstart", unlockPlaybackAudio, { passive: true });
    window.addEventListener("keydown", unlockPlaybackAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockPlaybackAudio);
      window.removeEventListener("touchstart", unlockPlaybackAudio);
      window.removeEventListener("keydown", unlockPlaybackAudio);
    };
  }, [isHost, playerRef]);

  useEffect(() => {
    // Vory 5.5.3E.11.5:
    // Yeni video seçildiğinde eski kullanıcı-pause bayrağı mobil host autoplay'i bloklamasın.
    try {
      window.__voryUserPausedVideo = false;
      window.__voryMediaGuardUntil = Date.now() + 18000;
      window.__voryMediaPersistUntil = Date.now() + 18000;
    } catch {}
  }, [videoId]);

  useEffect(() => {
    // Vory 5.5.3E.10.1: videoId tanımlandıktan sonra Media Session bağlanır.
    // Bu sıra, platform seçimi sonrası siyah ekrana düşüren TDZ crash'ini engeller.
    try {
      if (!("mediaSession" in navigator)) return;

      navigator.mediaSession.metadata = videoId
        ? new MediaMetadata({
            title: "Vory Watch Party",
            artist: "VoryApp",
            album: "Room playback",
          })
        : null;

      navigator.mediaSession.playbackState = videoId ? "playing" : "none";

      navigator.mediaSession.setActionHandler?.("play", () => {
        try { playerRef.current?.playVideo?.(); } catch {}
      });
      navigator.mediaSession.setActionHandler?.("pause", () => {
        try {
          if (isVoryMediaGuardActive()) {
            playerRef.current?.playVideo?.();
            return;
          }
          playerRef.current?.pauseVideo?.();
        } catch {}
      });
    } catch {}
  }, [videoId, playerRef]);

  function getRoomCode() {
    return window.currentRoomCode || "";
  }

  function isVoryMediaGuardActive() {
    try {
      const now = Date.now();
      return (
        now < Number(window.__voryVoiceTransitionUntil || 0) + 12000 ||
        now < Number(window.__voryMediaPersistUntil || 0) ||
        now < Number(window.__voryMediaGuardUntil || 0)
      );
    } catch {
      return false;
    }
  }


  function isMobileViewer() {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  }

  function canRestoreAudiblePlayback() {
    if (typeof window === "undefined") return false;
    return !!window.__voryPlaybackUserUnlocked || !isMobileViewer();
  }

  function getMobileLatencyCompensation() {
    if (typeof window === "undefined") return 0;
    return isMobileViewer() ? 0.22 : 0;
  }

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  async function toggleVoryFullscreen() {
    const shell = fullscreenShellRef.current;
    if (!shell) return;

    const fullscreenElement = getFullscreenElement();

    try {
      if (fullscreenElement === shell) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.mozCancelFullScreen?.() || document.msExitFullscreen?.());
        return;
      }

      if (fullscreenElement && fullscreenElement !== shell) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.mozCancelFullScreen?.() || document.msExitFullscreen?.());
      }

      const request =
        shell.requestFullscreen?.bind(shell) ||
        shell.webkitRequestFullscreen?.bind(shell) ||
        shell.mozRequestFullScreen?.bind(shell) ||
        shell.msRequestFullscreen?.bind(shell);

      if (request) {
        await request();
      }
    } catch {}
  }

  function cleanupPlayer(target = localPlayerRef.current) {
    if (!target) return;

    try {
      target.stopVideo?.();
    } catch {}

    try {
      target.destroy?.();
    } catch {}
  }

  function requestForceSync(reason = "recovery") {
    const roomCode = getRoomCode();
    if (!roomCode) return;

    const now = Date.now();
    // Vory 5.5.3E.13.5: sync requests were too aggressive and made YouTube
    // pause/play in short loops. Keep recovery calm unless user really rejoins.
    const minDelay =
      reason === "initial-ready"
        ? 2800
        : reason === "join-room" || reason === "socket-connect"
          ? 2200
          : reason === "voice-transition" || reason === "visibility-media-resume"
            ? 5200
            : 4200;

    if (now - lastForceSyncRef.current < minDelay) return;
    lastForceSyncRef.current = now;

    socket.emit("force-video-sync", { roomCode, reason });
  }

  function forceMobileHostAutoplay(player, reason = "host-autoplay") {
    if (!player) return;

    const attempts = [0, 420, 1150];

    attempts.forEach((delay) => {
      const timer = window.setTimeout(() => {
        try {
          // Host yeni medya başlattığında mobil Safari/Chrome bazen ilk play çağrısını yutuyor.
          // Burada artık video-control yaymıyoruz; tek oda yayını handleReady sonunda yapılır.
          // Aksi halde viewer tarafında art arda seek/play loop oluşuyordu.
          ignoreEventRef.current = true;
          if (isMobileViewer() && !window.__voryPlaybackUserUnlocked) {
            player.mute?.();
          }
          player.playVideo?.();
          window.setTimeout(() => {
            ignoreEventRef.current = false;
          }, 240);
        } catch {
          ignoreEventRef.current = false;
        }
      }, delay);

      autoPlayBurstTimersRef.current.push(timer);
    });
  }

  function requestAutoNext() {
    if (!isHost || autoNextLockRef.current) return;

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
    const readyVersion = readyVersionRef.current;
    const nextPlayer = event.target;

    // Eski player instance'ı varsa önce sustur/destroy et.
    if (localPlayerRef.current && localPlayerRef.current !== nextPlayer) {
      cleanupPlayer(localPlayerRef.current);
    }

    localPlayerRef.current = nextPlayer;
    playerRef.current = nextPlayer;

    if (isHost && videoId && hostAutoPlayDoneRef.current !== videoId) {
      hostAutoPlayDoneRef.current = videoId;

      setTimeout(() => {
        if (readyVersionRef.current !== readyVersion) return;

        try {
          ignoreEventRef.current = true;
          nextPlayer.seekTo?.(0, true);
          if (isMobileViewer() && !window.__voryPlaybackUserUnlocked) {
            nextPlayer.mute?.();
          }
          nextPlayer.playVideo?.();
          burstNormalizePlaybackVolume(nextPlayer, { allowUnmute: true, preferredVolume: 100 });
          forceMobileHostAutoplay(nextPlayer, "host-ready");

          setTimeout(() => {
            ignoreEventRef.current = false;
            onVideoControl?.("play", nextPlayer.getCurrentTime?.() || 0);
            requestForceSync("host-ready-autoplay");
          }, 450);
        } catch {
          ignoreEventRef.current = false;
        }
      }, 450);

      return;
    }

    if (!isHost) {
      // Mobil viewer autoplay: muted start; mobilde mikro takılma olmaması için seek burst yumuşatıldı.
      viewerAutoStartedRef.current = false;
      autoPlayBurstTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoPlayBurstTimersRef.current = [];

      const latestSync = window.__voryLatestSyncState || null;
      const mobileViewer = isMobileViewer();
      const mobileCompensation = getMobileLatencyCompensation();

      if (latestSync) {
        try {
          nextPlayer.seekTo?.(
            Math.max(0, (Number(latestSync.currentTime) || 0) + (latestSync.isPlaying ? mobileCompensation : 0)),
            true
          );
        } catch {}
      }

      const kickViewerPlayback = (delay, reason, allowSeek = false) => {
        const timer = window.setTimeout(() => {
          try {
            if (isMobileViewer() && !canRestoreAudiblePlayback()) {
              nextPlayer.mute?.();
            }
            const baseTime = Number(window.__voryLatestSyncState?.currentTime || latestSync?.currentTime || 0);
            const shouldCompensate = !!(window.__voryLatestSyncState?.isPlaying ?? latestSync?.isPlaying ?? true);
            const targetTime = Math.max(0, baseTime + (shouldCompensate ? mobileCompensation : 0));
            const localTime = Number(nextPlayer.getCurrentTime?.() || 0);
            const drift = Math.abs(localTime - targetTime);

            // Mobilde her burst'te seek yapmak milisaniyelik donma oluşturuyor.
            // İlk kilitleme hariç sadece ciddi drift varsa seek at.
            const shouldSeek = targetTime > 0.15 && (allowSeek || !mobileViewer || drift > 1.25);
            if (shouldSeek) {
              nextPlayer.seekTo?.(targetTime, true);
            }
            normalizePlaybackVolume(nextPlayer, { allowUnmute: canRestoreAudiblePlayback(), preferredVolume: 85 });
            nextPlayer.playVideo?.();
          } catch {}
          if (!mobileViewer || reason === "initial-ready") {
            requestForceSync(reason);
          }
        }, delay);

        autoPlayBurstTimersRef.current.push(timer);
      };

      // Vory 5.5.3E.13.5: two calm kicks are enough. The old 5-step burst
      // kept calling play/seek and looked like video buffering/stuttering.
      [0, 1250].forEach((delay, index) => {
        kickViewerPlayback(delay, index === 0 ? "initial-ready" : "join-room", index === 0);
      });
    }
  }

  function shouldProtectPlaybackFromSystemPause() {
    const now = Date.now();
    const voiceTransitionUntil = Number(window.__voryVoiceTransitionUntil || 0);
    const mediaPersistUntil = Number(window.__voryMediaPersistUntil || 0);

    return (
      now < voiceTransitionUntil + 16000 ||
      now < mediaPersistUntil ||
      now < Number(window.__voryMediaGuardUntil || 0) ||
      document.visibilityState === "hidden"
    );
  }

  function resumeAfterSystemPause(reason = "system-pause") {
    const player = playerRef.current;
    if (!player || !videoId) return;

    // Keep resume gentle; rapid play bursts cause visible pause/play loops.
    [180, 1100].forEach((delay) => {
      window.setTimeout(() => {
        try {
          const state = player.getPlayerState?.();
          if (state === 2 || state === 5 || state === -1) {
            ignoreEventRef.current = true;
            normalizePlaybackVolume(player, { allowUnmute: isHost || canRestoreAudiblePlayback(), preferredVolume: isHost ? 100 : 85 });
            player.playVideo?.();
            window.setTimeout(() => {
              ignoreEventRef.current = false;
            }, 260);
          }
        } catch {}
      }, delay);
    });

    if (!isHost && reason !== "protected-pause" && reason !== "system-pause") requestForceSync(reason);
  }

  function handleStateChange(event) {
    if (!playerRef.current || ignoreEventRef.current) return;

    const currentTime = playerRef.current.getCurrentTime?.() || 0;
    const now = Date.now();

    if (event.data === 1) {
      lastKnownPlayingRef.current = true;
      normalizePlaybackVolume(playerRef.current, { allowUnmute: isHost || canRestoreAudiblePlayback(), preferredVolume: isHost ? 100 : 85 });
      if ("mediaSession" in navigator) {
        try { navigator.mediaSession.playbackState = "playing"; } catch {}
      }
    }

    if (event.data === 2) {
      const protectedPause = shouldProtectPlaybackFromSystemPause();

      // Voice join/leave, WebRTC device switch, mobile visibility/background ve tab değişimlerinde
      // YouTube iframe kısa PAUSE düşürebiliyor. Bu gerçek kullanıcı pause'u değil.
      if (protectedPause) {
        resumeAfterSystemPause("protected-pause");
        return;
      }

      if ("mediaSession" in navigator) {
        try { navigator.mediaSession.playbackState = "paused"; } catch {}
      }
    }

    if (!isHost) {
      if (event.data === 1) {
        viewerAutoStartedRef.current = true;
      }

      if (event.data === 2 && shouldProtectPlaybackFromSystemPause()) {
        resumeAfterSystemPause("viewer-protected-pause");
      }

      return;
    }

    // Host tarafında da voice transition sırasında gelen pause'u odaya yayma.
    if (event.data === 2 && shouldProtectPlaybackFromSystemPause()) {
      resumeAfterSystemPause("host-protected-pause");
      return;
    }

    if (event.data === 1) {
      lastHostActionRef.current = { action: "play", at: now };
      onVideoControl?.("play", currentTime);
    }

    if (event.data === 2) {
      const lastAction = lastHostActionRef.current || {};
      const duplicatePause = lastAction.action === "pause" && now - Number(lastAction.at || 0) < 950;

      if (!duplicatePause) {
        lastKnownPlayingRef.current = false;
        lastUserPauseAtRef.current = now;
        lastHostActionRef.current = { action: "pause", at: now };
        onVideoControl?.("pause", currentTime);
      }
    }

    if (event.data === 0) {
      lastKnownPlayingRef.current = false;
      onVideoControl?.("pause", currentTime);
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
    readyVersionRef.current += 1;
    hostAutoPlayDoneRef.current = "";

    return () => {
      readyVersionRef.current += 1;
      cleanupPlayer(localPlayerRef.current);

      if (playerRef.current === localPlayerRef.current) {
        playerRef.current = null;
      }

      localPlayerRef.current = null;
      ignoreEventRef.current = false;
      clearTimeout(recoveryTimerRef.current);
      autoPlayBurstTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoPlayBurstTimersRef.current = [];
    };
  }, [videoId]);

  useEffect(() => {
    // Vory 5.5.0: voice join/leave sırasında YouTube iframe'i yeniden sync döngüsüne girmesin.
    clearTimeout(recoveryTimerRef.current);
    return () => clearTimeout(recoveryTimerRef.current);
  }, [videoId, isHost]);

  useEffect(() => {
    function handleVoiceTransition() {
      window.__voryMediaPersistUntil = Date.now() + 6500;
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = setTimeout(() => {
        if (!videoId) return;
        if (!isHost) requestForceSync("voice-transition");
        try {
          const state = playerRef.current?.getPlayerState?.();
          if (state === 2 || state === 5 || state === -1) {
            normalizePlaybackVolume(playerRef.current, { allowUnmute: isHost || canRestoreAudiblePlayback(), preferredVolume: isHost ? 100 : 85 });
            playerRef.current?.playVideo?.();
          }
        } catch {}
      }, 700);
    }

    window.addEventListener("vory-voice-transition", handleVoiceTransition);
    return () => window.removeEventListener("vory-voice-transition", handleVoiceTransition);
  }, [videoId, isHost]);


  function markBackgroundMediaGuard() {
    try {
      window.__voryMediaGuardUntil = Date.now() + 45000;
      window.__voryMediaPersistUntil = Date.now() + 45000;
      if ("mediaSession" in navigator && videoId) {
        navigator.mediaSession.playbackState = "playing";
      }
    } catch {}
  }

  useEffect(() => {
    function handleVisibilityResume() {
      window.__voryMediaPersistUntil = Date.now() + 6500;
      window.__voryMediaGuardUntil = Date.now() + 18000;

      if (document.visibilityState === "hidden") {
        markBackgroundMediaGuard();
        return;
      }

      if (document.visibilityState !== "visible" || !videoId) return;

      setTimeout(() => {
        try {
          const latestSync = window.__voryLatestSyncState || {};
          if (latestSync.isPlaying === false && !lastKnownPlayingRef.current) return;

          const player = playerRef.current;
          const state = player?.getPlayerState?.();
          if (state === 2 || state === 5 || state === -1) {
            normalizePlaybackVolume(player, { allowUnmute: isHost || canRestoreAudiblePlayback(), preferredVolume: isHost ? 100 : 85 });
            player?.playVideo?.();
          }

          // Do not request an immediate hard sync on every tab/focus return.
          // The server/client heartbeat will settle drift without visible stutter.
          if (!isHost && Date.now() - lastForceSyncRef.current > 6500) {
            requestForceSync("visibility-media-resume");
          }
        } catch {}
      }, 420);
    }

    function handlePageHideMediaGuard() {
      markBackgroundMediaGuard();
    }

    document.addEventListener("visibilitychange", handleVisibilityResume);
    window.addEventListener("focus", handleVisibilityResume);
    window.addEventListener("pagehide", handlePageHideMediaGuard);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityResume);
      window.removeEventListener("focus", handleVisibilityResume);
      window.removeEventListener("pagehide", handlePageHideMediaGuard);
    };
  }, [videoId, isHost]);


  useEffect(() => {
    function syncFullscreenState() {
      const fullscreenElement = getFullscreenElement();
      setIsVoryFullscreen(!!fullscreenElement && fullscreenElement === fullscreenShellRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    document.addEventListener("mozfullscreenchange", syncFullscreenState);
    document.addEventListener("MSFullscreenChange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
      document.removeEventListener("mozfullscreenchange", syncFullscreenState);
      document.removeEventListener("MSFullscreenChange", syncFullscreenState);
      document.body.style.overflow = "";
    };
  }, []);


  useEffect(() => {
    const shell = fullscreenShellRef.current;
    const fullscreenEl = getFullscreenElement();

    if (!fullscreenChatToast || !shell || fullscreenEl !== shell) return undefined;

    const oldNode = shell.querySelector(".vory-fullscreen-chat-overlay-dom");
    oldNode?.remove?.();

    const node = document.createElement("div");
    node.className = "vory-fullscreen-chat-overlay vory-fullscreen-chat-overlay-real vory-fullscreen-chat-overlay-dom";

    if (fullscreenChatToast.avatar) {
      const img = document.createElement("img");
      img.src = fullscreenChatToast.avatar;
      img.alt = "avatar";
      node.appendChild(img);
    } else {
      const avatar = document.createElement("div");
      avatar.className = "vory-fullscreen-chat-avatar";
      avatar.textContent = String(fullscreenChatToast.sender || "V").charAt(0).toUpperCase();
      node.appendChild(avatar);
    }

    const content = document.createElement("div");
    content.className = "min-w-0";

    const sender = document.createElement("strong");
    sender.textContent = fullscreenChatToast.sender || "Misafir";

    const message = document.createElement("span");
    message.textContent = fullscreenChatToast.message || "";

    content.appendChild(sender);
    content.appendChild(message);
    node.appendChild(content);
    shell.appendChild(node);

    const timer = window.setTimeout(() => {
      node.remove();
    }, 3400);

    return () => {
      window.clearTimeout(timer);
      node.remove();
    };
  }, [fullscreenChatToast?.id, isVoryFullscreen]);

  return (
    <section className="vory-video-player-549 flex min-h-0 flex-1 flex-col rounded-[1.25rem] bg-black/10 p-0 lg:min-h-[calc(100vh-164px)]">
      <div
        ref={fullscreenShellRef}
        className="vory-video-fullscreen-shell relative flex flex-1 items-center justify-center overflow-hidden rounded-[1.2rem] bg-black text-white/40"
        data-vory-fullscreen={isVoryFullscreen ? "true" : "false"}
      >
        {videoId ? (
          <YouTube
            key={`vory-player-${videoId}`}
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
                autoplay: 1,
                controls: 1,
                fs: 1,
                disablekb: isHost ? 0 : 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                enablejsapi: 1,
                origin: window.location.origin,
              },
            }}
          />
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
              <PlayCircle size={34} />
            </div>

            <p className="font-bold text-white/60">Video bekleniyor</p>
            <p className="mt-1 text-sm text-white/30">
              YouTube linki eklenince burada oynar.
            </p>
          </div>
        )}

        {fullscreenChatToast && isVoryFullscreen ? (
          <div className="vory-fullscreen-chat-overlay vory-fullscreen-chat-overlay-real" key={fullscreenChatToast.id}>
            {fullscreenChatToast.avatar ? (
              <img src={fullscreenChatToast.avatar} alt="avatar" />
            ) : (
              <div className="vory-fullscreen-chat-avatar">
                {String(fullscreenChatToast.sender || "V").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <strong>{fullscreenChatToast.sender}</strong>
              <span>{fullscreenChatToast.message}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default memo(VideoPlayer, (prev, next) => (
  prev.videoUrl === next.videoUrl &&
  prev.videoInput === next.videoInput &&
  prev.isHost === next.isHost &&
  (prev.fullscreenChatToast?.id || "") === (next.fullscreenChatToast?.id || "")
));
